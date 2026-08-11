/** Shape signed into the JWT — kept minimal on purpose, never carries the password. */
export class PayloadJwt {
  sub!: number;
  email!: string;

  static builder(): PayloadJwtBuilder {
    return new PayloadJwtBuilder();
  }
}

/** Fluent builder for `PayloadJwt` — mirrors `ResponseBodyBuilder`'s pattern. */
export class PayloadJwtBuilder {
  private sub?: number;
  private email?: string;

  withSub(sub: number): this {
    this.sub = sub;
    return this;
  }

  withEmail(email: string): this {
    this.email = email;
    return this;
  }

  build(): PayloadJwt {
    if (this.sub === undefined) {
      throw new Error('PayloadJwt.Builder: sub is required');
    }
    if (this.email === undefined) {
      throw new Error('PayloadJwt.Builder: email is required');
    }

    // A plain object literal, not `new PayloadJwt()`: `jsonwebtoken`'s
    // `sign()` requires the payload to be a *plain* object (via
    // `lodash.isPlainObject`) and rejects class instances outright.
    return { sub: this.sub, email: this.email };
  }
}
