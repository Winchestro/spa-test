

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import sqlite from "node:sqlite";


import View from "./view.js";
import User from "./user.js";
import Post from "./post.js";
import JWT from "./JWT.js";

const ACCESS_TOKEN = new JWT( fs.readFileSync( "JWT.txt" ), "30m", 1000 * 60 * 30 );



const DEBUG = {
  SILENT : false,
  DUMP_CACHE : false
};

const mainView = new View( 
  "Main",
  "",
  fs.readFileSync( "./main.css" )
);

const profileView = new View(
  "Profile",
  "",
  fs.readFileSync( "./profile.css" )
);

const postView = new View;

const PORT = 80;
const METHOD = {
  GET : "GET",
  POST : "POST"
};
const HEADER = {
  HTML : { "Content-Type" : "text/html" },
  JSON : { "Content-Type" : "application/json" },
  IMG  : { "Content-Type" : "image/jpeg" }
};
const STATUSCODE = {
  OK : 200,
  UNAUTHORIZED : 401,
  NOT_FOUND : 404
};

const DB = new sqlite.DatabaseSync('main.db');
const SQL = DB.createTagStore();

DB.exec( `
  CREATE TABLE IF NOT EXISTS profiles (uid, firstName, lastName, birthDate, about, email, phone, password);
  CREATE TABLE IF NOT EXISTS posts (uid, authorUID, date, content, photos);
`);




http.createServer( ( request, response ) => {
  console.log( request.url );
  console.log( typeof request.url );
  let requestPath = request.url.split( "/" );
  let endpoint = requestPath[ 1 ];

  if ( !DEBUG.SILENT ) console.log( request.method );
  if ( !DEBUG.SILENT ) console.log( request.url );


      
  let claims = ACCESS_TOKEN.verifyCookie( request.headers.cookie );
  let authUser = null;
  if ( claims && claims.user ) {
    console.log( claims );
    authUser = new User().fromJSON( SQL.get`SELECT * FROM profiles WHERE uid = ${ claims.user };`);
    View.user = authUser;

  } else {
    View.user = null;
  }

  if ( !DEBUG.SILENT ) console.log( authUser );

  switch ( endpoint ) {

    case "users" : {
      let uid = requestPath[ 2 ];
      let user = new User().fromJSON( SQL.get`SELECT * FROM profiles WHERE uid = ${ uid };`);
      
      if ( user ) {
        user.updateAuthorization( authUser );
        if ( !DEBUG.SILENT ) console.log( "User authorized = " + user.isAuthorized );
        let method = requestPath[ 3 ];

        switch ( method ) {
          case "view" : {
            profileView.cleanup();
            profileView.title = user.firstName;
            profileView.addBody( user.HTMLView );
            
            giveHTML( response, profileView.HTML );
            
            break;
          }
          case "edit" : {
            switch ( request.method ) {
              case METHOD.GET : {
                if ( user.isAuthorized ) {
                  profileView.cleanup();

                  profileView.title = user.firstName;
                  profileView.addBody( user.HTMLEdit );

                  giveHTML( response, profileView.HTML );
                  
                } else rejectUnauthorized( response );
                break;
              }
              case METHOD.POST : {
                if ( user.isAuthorized ) processJSONPost( request, body => {
                  if ( !DEBUG.SILENT ) console.log( body );
                  
                  DB.exec(` UPDATE profiles
                    SET 
                      firstName = '${ SQLquoteEscape( HTMLTagstrip( body.firstName ) ) }', 
                      lastName = '${ SQLquoteEscape( HTMLTagstrip( body.lastName ) ) }', 
                      birthDate = '${ SQLquoteEscape( HTMLTagstrip( body.birthDate ) ) }', 
                      about = '${ SQLquoteEscape( HTMLTagstrip( body.about ) ) }', 
                      phone = '${ SQLquoteEscape( HTMLTagstrip( body.phone ) ) }'
                    WHERE uid = '${ user.uid }';
                  `);


                  giveJSON( response, { message : "User updated" });
                });
                else rejectUnauthorized( response );
                break;
              }
            }
            break;
          }
          case "delete" : {
            if (  user.isAuthorized ) {
              DB.exec(`DELETE FROM profiles WHERE uid = '${ user.uid }'`);
              giveJSON( response, { message : "delete successful"});
            } else rejectUnauthorized( response );
            break;
          }
          case "" : {
            giveJSON( response, user );
            break;
          }
        }
      } else if( DEBUG.DUMP_CACHE ) giveJSON( response, SQL.all`SELECT * FROM profiles LIMIT 200 OFFSET 0;` );
      else rejectNotFound( response );

      break;
    }

    case "posts" : {
      let uid = requestPath[ 2 ];

      if ( !uid && authUser && request.method === METHOD.POST ) {
        let uid = crypto.randomUUID();
        
        processJSONPost ( request, body => {
          console.log( body );
          DB.exec(`INSERT INTO posts VALUES(
            '${ uid }',
            '${ authUser.uid }',
            '${ new Date( Date.now() ) }',
            '${ SQLquoteEscape( HTMLTagstrip( body.content ) ) }',
            '[]'
          )`);
        });


      } else {
        let post = new Post().fromJSON( SQL.get`SELECT * FROM posts WHERE uid = ${ uid }` );

        if ( post ) {
          post.resolveAuthorref( new User().fromJSON( SQL.get`SELECT * FROM profiles WHERE uid = ${ post.author }`) ).updateAuthorization( authUser );

          let method = requestPath[ 3 ];

          switch ( method ) {
            case "view" : {
              
              mainView.cleanup();
              mainView.addBody( post.HTMLView );

              giveHTML( response, mainView.HTML );
              break;
            }
            case "edit" : {
              switch ( request.method ) {
                case METHOD.GET : {
                  if( post.isAuthorized ) {
                    console.log( post.HTMLEdit );
                    mainView.cleanup();
                    mainView.addBody( post.HTMLEdit );
                    giveHTML( response, mainView.HTML );
                  } else rejectUnauthorized( response );
                  break;
                }
                case METHOD.POST : {
                  if( post.isAuthorized ) {
                    processJSONPost( request, ( body ) =>{

                       DB.exec(` UPDATE posts
                        SET 
                          date = '${ new Date( Date.now() ) }', 
                          content = '${ SQLquoteEscape( HTMLTagstrip( body.content ) ) }', 
                          photos = '[]'
                        WHERE uid = '${ post.uid }';
                      `);
                      
                      giveJSON( response, { message : "update successful" } );
                    });
                  } else rejectUnauthorized( response );
                  break;  
                }
              }
              break;
            }
            case "delete" : {
              if (  post.isAuthorized ) {
                DB.exec(`DELETE FROM posts WHERE uid = '${ post.uid }'`);
                giveJSON( response, { message : "delete successful"});
              } else rejectUnauthorized( response );
              break;
            }
            case "" : {
              giveJSON( response, post );
              break;
            }
          }
        } else if ( DEBUG.DUMP_CACHE ) giveJSON( response, SQL.all`SELECT * FROM posts ORDER BY date LIMIT 200 OFFSET 0` );
        else rejectNotFound( response );
      }
      break;
    }

    case "uploads" : {
      let imageURL = requestPath[ 2 ];

      switch ( request.method ) {
        case METHOD.GET : {
          fs.readFile( import.meta.dirname + "/uploads/" + imageURL, ( error, data ) => {
            if ( error ) fs.readFile( import.meta.dirname + "/uploads/default.jfif", ( error, data ) => {
              response.writeHead( STATUSCODE.OK, HEADER.IMG );
              response.end( data );
            })
            else {
              response.writeHead( STATUSCODE.OK, HEADER.IMG );
              response.end( data );
            }
          })
          break; 
        }

        case METHOD.POST : {
          processBlobPost ( request, body => {
            console.log( "recieving image");
            let extension = request.headers[ "content-type" ].split( "/" )[ 1 ];
            console.log( imageURL );
            console.log( body );

            fs.writeFile( `./uploads/${ imageURL }.jfif`, body, error =>{
              if ( error ) rejectUnauthorized( response );
              else giveJSON( response, { message : "upload successful" });
            });
          });

          break;
        }

      }
      

      break;
    }

    case "auth" : {
      let method = requestPath[ 2 ];
      

      switch ( method ) {
        case "register" : {
          switch ( request.method ) {
            case METHOD.GET : {

              profileView.cleanup();
              profileView.title = "Create Account";
              profileView.addBody( User.HTMLRegister );
              
              giveHTML( response, profileView.HTML );
              

              break;
            }
            case METHOD.POST : {
              processJSONPost ( request,  body =>{
                if ( !DEBUG.SILENT ) console.log( body );
                let uid = crypto.randomUUID();
                let tokenJWT = ACCESS_TOKEN.generateToken( { user:uid } );
                
                DB.exec(`INSERT INTO profiles VALUES(
                  '${ uid }',
                  '${ SQLquoteEscape( HTMLTagstrip( body.firstName ) ) }',
                  '${ SQLquoteEscape( HTMLTagstrip( body.lastName ) ) }',
                  '${ new Date( body.birthDate ).getTime() }',
                  '${ SQLquoteEscape( HTMLTagstrip( body.about ) ) }',
                  '${ SQLquoteEscape( HTMLTagstrip( body.email ) ) }',
                  '${ SQLquoteEscape( HTMLTagstrip( body.phone ) ) }',
                  '${ crypto.hash( "sha1", body.password ) }'
                )`);


                ACCESS_TOKEN.store( tokenJWT );
                if( !DEBUG.SILENT ) console.log( tokenJWT );

                response.writeHead( STATUSCODE.OK, { 
                  "Content-Type" : "application/json",
                  "Set-Cookie" : `Token=${ tokenJWT }; Path=/; Expires=${ ACCESS_TOKEN.expirationDate }; HttpOnly;`
                });
                response.end( JSON.stringify ( { message : "user created" }) );
              });
              break;  
            }
          }
          
        }
        case "login" : {
          switch ( request.method ) {
            case METHOD.GET : {
              if ( !DEBUG.SILENT ) console.log( "Login" );
              profileView.cleanup();
              profileView.title = "Login";
              profileView.addBody( User.HTMLLogin );

              giveHTML( response, profileView.HTML );
              break;  
            }
            case METHOD.POST : {
              processJSONPost ( request, body =>{
                if( !DEBUG.SILENT ) console.log( body );
                let users = SQL.all`SELECT * FROM profiles WHERE email = ${ body.email };`

                if ( !users.length ) rejectUnauthorized( response, JSON.stringify({ error : "Invalid email password combination" }));
                let password = crypto.hash( "sha1", body.password );
                let valid = false;
                let validUser = null;
                for ( let user of users ) {
                  console.log( user );
                  let match = crypto.timingSafeEqual( Buffer.from( password ), Buffer.from( user.password ) );
                  if( match ) validUser = user;
                  valid = valid || match;
                }
                
                

                if ( !valid ) rejectUnauthorized( response, JSON.stringify({ error : "Invalid email password combination" }));
                
                let tokenJWT = ACCESS_TOKEN.generateToken( { user : validUser.uid } );
                response.writeHead( STATUSCODE.OK, { 
                  "Content-Type" : "application/json",
                  "Set-Cookie" : `Token=${ tokenJWT }; Path=/; Expires=${ ACCESS_TOKEN.expirationDate }; HttpOnly;`
                });
                response.end( JSON.stringify ( { message : "Successful login" }) );

              });
              break;
            }
          }
          break;
        }
      }

      
      break;  
    }

    case "" : {
      mainView.cleanup();
      mainView.title = "Home";
      console.log()
      let q = SQL.all`SELECT * FROM posts ORDER BY date LIMIT 200 OFFSET 0`;

      for ( let post of q ) {
        let p = new Post().fromJSON( post );
        p.resolveAuthorref( new User().fromJSON( ( SQL.get`SELECT * FROM profiles WHERE uid = ${ p.author };` ) ) ).updateAuthorization( authUser );
        
        mainView.addBody( p.HTMLView );
      }
      mainView.addFooter( Post.HTMLWrite );
      giveHTML( response, mainView.HTML );
     
      break;
    }

  }
}).listen( PORT, function (){
  if ( !DEBUG.SILENT ) console.log( "Server listening on " + PORT );
});

function giveHTML ( response, html ) {
  response.writeHead( STATUSCODE.OK, HEADER.HTML );
  response.end( html );
}

function giveJSON ( response, object ) {
  console.log( 'give JSON' + JSON.stringify( object ) );
  response.writeHead( STATUSCODE.OK, HEADER.JSON );
  response.end( JSON.stringify ( object ) );
}

function rejectNotFound ( response, body ) {
  response.writeHead( STATUSCODE.NOT_FOUND, HEADER.HTML );
  response.end( body );
}

function rejectUnauthorized ( response, body ) {
  response.writeHead( STATUSCODE.UNAUTHORIZED, HEADER.HTML );
  response.end( body );
}

function SQLquoteEscape( text ) {
  return text.replaceAll("'","''");
}

function HTMLTagstrip ( text ) {
  return text.replaceAll( /(<([^>]+)>)/gi, '');
}

function processBlobPost ( request, callback ) {
  let chunks = [];

  request.on( "data", chunk => chunks.push( chunk ) );

  request.on( "end", () => {
    callback( Buffer.concat( chunks ) );
  })
}

function processJSONPost ( request, callback ) {
  let body = "";

  request.setEncoding( "utf8" );
  request.on( "data", function ondata ( data )  {
      body += data;
      if (body.length > 1e6) {
        request.connection.destroy();
        body = "";
      }
  });

  request.on( "end", function onend ()  {

    body = JSON.parse( body );

    callback( body );
  });

}