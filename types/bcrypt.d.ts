/**
 * Type declarations for bcrypt (no bundled types in package).
 */
declare module 'bcrypt' {
  const bcrypt: {
    genSalt(rounds?: number): Promise<string>;
    hash(data: string | Buffer, saltOrRounds: string | number): Promise<string>;
    compare(data: string | Buffer, encrypted: string): Promise<boolean>;
  };
  export default bcrypt;
}
