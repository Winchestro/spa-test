import crypto from "node:crypto";

export default class JWT {
  #SECRET;
  #EXPIRATION_STRING;
  #EXPIRATION_INT;
  #TOKEN_CACHE = new Set;
  #HEADER;
  constructor ( secret, expirationString, expirationInt ) {
  	this.#HEADER = JWT.escape64( JWT.JSON64({ alg: "HS256", typ: "JWT" }) );
  	this.#SECRET = secret;
  	this.#EXPIRATION_STRING = expirationString;
  	this.#EXPIRATION_INT = expirationInt;
  }

  store ( token ) {
  	this.#TOKEN_CACHE.add( token );
  	return this;
  }

  delete ( token ) {
  	this.#TOKEN_CACHE.delete( token );
  	return this;
  }



  get expirationDate () {
  	return new Date( Date.now() + this.#EXPIRATION_INT ).toGMTString();
  }

  generateToken ( objPayload ) {
  	objPayload.exp = Date.now() + this.#EXPIRATION_INT;

  	return `${ this.#HEADER }.${ JWT.escape64( JWT.JSON64( objPayload ) ) }.${ this.sign( objPayload ) }`;
  }

  verifyCookie ( cookie ) {
  	if ( !cookie ) return {};
  	return this.verifyToken( JWT.parseCookie( cookie ) );
  }

  verifyToken ( token ) {
  	const [ b64header, b64payload, signature ] = token.split('.');
  	const objPayload = JSON.parse( Buffer.from( b64payload, "base64url" ).toString( ) );
  	const expectedSignature = this.sign( objPayload );
  	const isValid = crypto.timingSafeEqual( Buffer.from( signature ), Buffer.from( expectedSignature ) );
  	const notExpired = Date.now() < objPayload.exp;

  	if ( isValid && notExpired ) return objPayload;
  }

  sign ( objPayload ) {
  	return JWT.escape64( crypto.createHmac( "sha256", this.#SECRET ).update(`${ this.#HEADER }.${ objPayload }`).digest( "base64" ) );
  }

  static parseCookie( cookie ) {
  	let results = cookie.match(/Token=(.*)/);
  	if ( results.length > 0) return results[1];
  	else return "";
  }

  static escape64 ( b64 ) {
  	return b64.replace( /[=+/]/g, c => {
      switch ( c ) {
        case '=':
          return '';
        case '+':
          return '-';
        case '/':
          return '_';
      }
    });
  }

  static JSON64 ( obj ) {
    return Buffer.from( JSON.stringify ( obj ) ).toString ( "base64" );
  }

  
};