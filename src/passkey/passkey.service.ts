import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
  WebAuthnCredential,
  VerifiedRegistrationResponse,
  VerifiedAuthenticationResponse,
} from '@simplewebauthn/server';

import { Passkey, PasskeyDocument } from './passkey.schema.js';
import { PasskeyItemDto } from './passkey.dto.js';

type ChallengeEntry = { challenge: string; createdAt: number };

const CHALLENGE_TTL_MS = 60_000;
const CLEANUP_INTERVAL_MS = 5 * 60_000;

@Injectable()
export class PasskeyService {
  private readonly logger = new Logger(PasskeyService.name);

  /** userId -> challenge (for registration) */
  private readonly registrationChallenges = new Map<string, ChallengeEntry>();
  /** userId -> challenge (for authentication) */
  private readonly authChallenges = new Map<string, ChallengeEntry>();

  constructor(
    @InjectModel(Passkey.name)
    private readonly passkeyModel: Model<PasskeyDocument>,
    private readonly configService: ConfigService,
  ) {
    setInterval(() => this.cleanupExpiredChallenges(), CLEANUP_INTERVAL_MS);
  }

  private get rpName(): string {
    return this.configService.get<string>('WEBAUTHN_RP_NAME') ?? 'Pluto';
  }

  private get rpID(): string {
    return this.configService.get<string>('WEBAUTHN_RP_ID') ?? 'localhost';
  }

  private get origin(): string {
    return (
      this.configService.get<string>('WEBAUTHN_ORIGIN') ??
      'http://localhost:5173'
    );
  }

  private cleanupExpiredChallenges(): void {
    const now = Date.now();
    for (const [key, entry] of this.registrationChallenges.entries()) {
      if (now - entry.createdAt > CHALLENGE_TTL_MS) {
        this.registrationChallenges.delete(key);
      }
    }
    for (const [key, entry] of this.authChallenges.entries()) {
      if (now - entry.createdAt > CHALLENGE_TTL_MS) {
        this.authChallenges.delete(key);
      }
    }
  }

  private getActiveChallenge(
    map: Map<string, ChallengeEntry>,
    key: string,
  ): string | null {
    const entry = map.get(key);
    if (!entry) return null;
    if (Date.now() - entry.createdAt > CHALLENGE_TTL_MS) {
      map.delete(key);
      return null;
    }
    return entry.challenge;
  }

  // ─── Registration ────────────────────────────────────────────────────────────

  async generateRegistrationOptions(
    userId: string,
    userEmail: string,
    userName: string,
  ) {
    const existingPasskeys = await this.passkeyModel
      .find({ userId: new Types.ObjectId(userId) })
      .lean()
      .exec();

    const options = await generateRegistrationOptions({
      rpName: this.rpName,
      rpID: this.rpID,
      userID: Uint8Array.from(Buffer.from(userId)),
      userName: userEmail,
      userDisplayName: userName,
      attestationType: 'none',
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
        authenticatorAttachment: 'platform',
      },
      excludeCredentials: existingPasskeys.map((p) => ({
        id: p.credentialId,
        transports: p.transports as AuthenticatorTransportFuture[],
      })),
    });

    this.registrationChallenges.set(userId, {
      challenge: options.challenge,
      createdAt: Date.now(),
    });

    return options;
  }

  async verifyRegistration(
    userId: string,
    credential: RegistrationResponseJSON,
    deviceName?: string,
  ): Promise<PasskeyDocument> {
    const expectedChallenge = this.getActiveChallenge(
      this.registrationChallenges,
      userId,
    );
    if (!expectedChallenge) {
      throw new BadRequestException(
        'Registration challenge expired or not found',
      );
    }

    let verification: VerifiedRegistrationResponse;
    try {
      verification = await verifyRegistrationResponse({
        response: credential,
        expectedChallenge,
        expectedOrigin: this.origin,
        expectedRPID: this.rpID,
        requireUserVerification: false,
      });
    } catch (error) {
      this.logger.error('Registration verification failed', error);
      throw new BadRequestException('Passkey registration verification failed');
    }

    this.registrationChallenges.delete(userId);

    const { verified, registrationInfo } = verification;
    if (!verified || !registrationInfo) {
      throw new BadRequestException('Passkey registration not verified');
    }

    const { credential: cred, credentialDeviceType } = registrationInfo;

    const passkey = new this.passkeyModel({
      userId: new Types.ObjectId(userId),
      credentialId: cred.id,
      publicKey: Buffer.from(cred.publicKey).toString('base64url'),
      counter: cred.counter,
      transports: cred.transports ?? [],
      deviceType: credentialDeviceType,
      deviceName: deviceName ?? null,
    });

    await passkey.save();
    this.logger.log(
      `Passkey registered for user ${userId}, credentialId: ${cred.id}`,
    );
    return passkey;
  }

  // ─── Authentication ───────────────────────────────────────────────────────────

  /**
   * Generates authentication options for conditional UI (discoverable credentials).
   * Does not restrict allowCredentials, allowing the authenticator to select any matching credential.
   * Challenge is stored under a reserved key "_conditional".
   */
  async generateDiscoverableAuthenticationOptions() {
    const options = await generateAuthenticationOptions({
      rpID: this.rpID,
      userVerification: 'preferred',
      allowCredentials: [],
    });

    this.authChallenges.set('_conditional', {
      challenge: options.challenge,
      createdAt: Date.now(),
    });

    return options;
  }

  async generateAuthenticationOptions(userId: string) {
    const userPasskeys = await this.passkeyModel
      .find({ userId: new Types.ObjectId(userId) })
      .lean()
      .exec();

    const options = await generateAuthenticationOptions({
      rpID: this.rpID,
      userVerification: 'preferred',
      allowCredentials: userPasskeys.map((p) => ({
        id: p.credentialId,
        transports: p.transports as AuthenticatorTransportFuture[],
      })),
    });

    this.authChallenges.set(userId, {
      challenge: options.challenge,
      createdAt: Date.now(),
    });

    return options;
  }

  async verifyAuthentication(
    userId: string,
    credential: AuthenticationResponseJSON,
  ): Promise<PasskeyDocument> {
    // Try userId-keyed challenge first, fall back to conditional UI challenge
    let expectedChallenge = this.getActiveChallenge(
      this.authChallenges,
      userId,
    );
    let challengeKey = userId;
    if (!expectedChallenge) {
      expectedChallenge = this.getActiveChallenge(
        this.authChallenges,
        '_conditional',
      );
      challengeKey = '_conditional';
    }
    if (!expectedChallenge) {
      throw new BadRequestException(
        'Authentication challenge expired or not found',
      );
    }

    const passkey = await this.passkeyModel
      .findOne({
        credentialId: credential.id,
        userId: new Types.ObjectId(userId),
      })
      .exec();

    if (!passkey) {
      throw new NotFoundException('Passkey not found');
    }

    const webAuthnCredential: WebAuthnCredential = {
      id: passkey.credentialId,
      publicKey: new Uint8Array(Buffer.from(passkey.publicKey, 'base64url')),
      counter: passkey.counter,
      transports: passkey.transports as AuthenticatorTransportFuture[],
    };

    let verification: VerifiedAuthenticationResponse;
    try {
      verification = await verifyAuthenticationResponse({
        response: credential,
        expectedChallenge,
        expectedOrigin: this.origin,
        expectedRPID: this.rpID,
        credential: webAuthnCredential,
        requireUserVerification: false,
      });
    } catch (error) {
      this.logger.error('Authentication verification failed', error);
      throw new BadRequestException(
        'Passkey authentication verification failed',
      );
    }

    this.authChallenges.delete(challengeKey);

    const { verified, authenticationInfo } = verification;
    if (!verified) {
      throw new BadRequestException('Passkey authentication not verified');
    }

    passkey.counter = authenticationInfo.newCounter;
    passkey.lastUsedAt = new Date();
    await passkey.save();

    this.logger.log(`Passkey auth success for credential ${credential.id}`);
    return passkey;
  }

  // ─── Management ──────────────────────────────────────────────────────────────

  async findByUserId(userId: string): Promise<PasskeyDocument[]> {
    return this.passkeyModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .exec();
  }

  async deleteById(id: string, userId: string): Promise<void> {
    const result = await this.passkeyModel
      .findOneAndDelete({
        _id: new Types.ObjectId(id),
        userId: new Types.ObjectId(userId),
      })
      .exec();
    if (!result) {
      throw new NotFoundException(
        'Passkey not found or does not belong to user',
      );
    }
    this.logger.log(`Passkey ${id} deleted by user ${userId}`);
  }

  async countByUserId(userId: string): Promise<number> {
    return this.passkeyModel
      .countDocuments({ userId: new Types.ObjectId(userId) })
      .exec();
  }

  async findByCredentialId(
    credentialId: string,
  ): Promise<PasskeyDocument | null> {
    return this.passkeyModel.findOne({ credentialId }).exec();
  }

  toPasskeyItemDto(passkey: PasskeyDocument): PasskeyItemDto {
    return {
      id: passkey._id.toString(),
      deviceName: passkey.deviceName ?? 'Unknown device',
      deviceType: passkey.deviceType ?? 'singleDevice',
      createdAt: passkey.createdAt.toISOString(),
      lastUsedAt: passkey.lastUsedAt ? passkey.lastUsedAt.toISOString() : null,
    };
  }
}
