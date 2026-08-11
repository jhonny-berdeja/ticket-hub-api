/** Response body for `POST /auth/login`. */
export class ResponseLogin {
  access_token: string;

  constructor(access_token: string) {
    this.access_token = access_token;
  }
}
