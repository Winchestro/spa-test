export default class User {
  #authorized;
  constructor ( uid, firstName, lastName, birthDate, about, email, phone, password ) {
    this.uid = uid;
    this.firstName = firstName;
    this.lastName = lastName;
    this.birthDate = birthDate;
    this.about = about;
    this.email = email;
    this.phone = phone;
    this.password = password;
  }

  static parseJSON ( key, value ) {
    if( typeof value === 'object' && value !== null)  {
      if ( value.firstName ) {
        return new User(
          value.uid, 
          value.firstName, 
          value.lastName, 
          value.birthDate, 
          value.about, 
          value.email, 
          value.phone,
          value.password
        );
      }
    }
    return value;
  }

  toString ( ) {
    return JSON.stringify( this );
  }

  get isAuthorized ( ) {
    return this.#authorized;
  }

  isUser ( user ) {
    return this.uid === user.uid;
  }

  updateAuthorization ( user ) {
    if ( !user ) return;
    if ( this.isUser( user ) ) this.#authorized = true;
    else this.#authorized = false;
    return this;
  }

  authorize ( ) {
    this.#authorized = true;
    return this;
  }

  unauthorize ( ) {
    this.#authorized = false;
    return this;
  }

  fromJSON ( obj ) {
    if ( obj ) {
      this.uid        = obj.uid;
      this.firstName  = obj.firstName;
      this.lastName   = obj.lastName;
      this.birthDate  = new Date( obj.birthDate );
      this.about      = obj.about;
      this.email      = obj.email;
      this.phone      = obj.phone;
      this.password   = obj.password;
      return this;
    }
  }

  get dateIntl () {
    return Intl.DateTimeFormat( "en-US", { 
      dateStyle : "long"
    } ).format( this.date );
  }

  get HTMLView () {
    return `
      <a class="avatar" href="/uploads/${ this.uid }.jfif" style="background-image: url('/uploads/${ this.uid }.jfif');" ></a>
      <h1> ${ this.firstName } ${ this.lastName }</h1>
      <h2> Born: ${ this.birthDate.toLocaleDateString('en-CA') } </h2>
      <adress>
        <a href="mailto: ${ this.email }">Mail: ${ this.email }</a>
        <a href="tel: ${ this.phone }">Phone: ${ this.phone }</a>
      </adress>
      <p> ${ this.about } </p>
      ${ this.isAuthorized ? `<a class="button" href="/users/${ this.uid }/edit">edit</a>` : "" }
    `;
  }
  get HTMLEdit () {
    
    return `
      <a class="avatar" id="avatarPreview" style="background-image: url('/uploads/${ this.uid }.jfif');" ></a>
      <form action="/users/${ this.uid }/edit" id="formUser" method="post">
        <label for="Avatar"     > Avatar:     <input id="avatarPicker" type="file" accept=".jfif" ></input></label>
        <label for="firstName"  > First Name: <input value="${ this.firstName   }" id="firstName" type="text"  size="30" ></input></label>
        <label for="lastName"   > Last Name:  <input value="${ this.lastName    }" id="lastName"  type="text"  size="30" ></input></label>
        <label for="birthDate"  > Birth Date: <input value="${ this.birthDate.toLocaleDateString('en-CA')  }" id="birthDate" type="date"  size="30" ></input></label>
        <label for="email"      > Email:      <input value="${ this.email       }" id="email"     type="email" size="30"></input></label>
        <label for="phone"      > Phone:      <input value="${ this.phone       }" id="phone"     type="tel"   size="30" ></input></label>
        <label for="about"      > About:      <textarea id="about"     rows="3" cols="50" >${ this.about       }</textarea></label>
        <label for="submit"><input id="submit" type="submit" onclick="location.href='/users/${ this.uid }/view'"></input></label>
      </form>
      <label for="cancel"><button id="cancel" onclick="location.href='/users/${ this.uid }/view'">Cancel</button></label>
      <script>
        window.userUID = "${ this.uid }";
        window.avatarURL = '/uploads/${ this.uid }.jfif';
        formUser.addEventListener("submit", ${ onsubmitEdit } );
        avatarPicker.addEventListener("change", ${ onfilechange } );
        window.addEventListener("drop", ${ ondrop });
        window.addEventListener("dragover", ${ ondragover });
        window.addEventListener("dragenter", ${ ondragenter });
        window.addEventListener("dragleave", ${ ondragleave });
      </script>
    `;
  }

  static get HTMLRegister () {
    return `
      <form action="/auth/register" id="formUser" method="post">
        <script>formUser.addEventListener("submit", ${ onsubmitRegister } );</script>
        <label for="Avatar"     > Avatar:     <input id="avatar" type="file" accept=".jfif" ></input></label>
        <label for="firstName"  > First Name: <input placeholder="First Name"   id="firstName" type="text"  size="30" ></input></label>
        <label for="lastName"   > Last Name:  <input placeholder="Last Name"    id="lastName"  type="text"  required size="30" ></input></label>
        <label for="birthDate"  > Birth Date: <input                            id="birthDate" type="date"  required size="30" ></input></label>
        <label for="email"      > Email:      <input placeholder="email"        id="email"     type="email" required size="30"></input></label>
        <label for="password"   > Password:   <input placeholder="password"     id="password"  type="password" required size="30"></input></label>
        <label for="phone"      > Phone:      <input placeholder="Telephone"    id="phone"     type="tel"   size="30" ></input></label>
        <label for="about"      > About:      <textarea placeholder="About..."  id="about"     rows="3" cols="50" ></textarea></label>
        <label for="submit"><input id="submit" type="submit" onclick="location.href='./';" ></input></label>
      </form>
      <label for="cancel"><button id="cancel" onclick="location.href='./';">Cancel</button></label>
    `;
  }

  static get HTMLLogin () {
    return `
      <form action="/auth/login" id="formUser" method="post">
        <script>formUser.addEventListener("submit", ${ onsubmitLogin } );</script>
        <label for="email"      > Email:      <input placeholder="email"        id="email"     type="email" required size="30"></input></label>
        <label for="password"   > Password:   <input placeholder="password"     id="password"  type="password" required size="30"></input></label>
        <label for="submit"><input id="submit" type="submit"" onclick="location.href='./'></input></label>
      </form>
      <label for="cancel"><button id="cancel" onclick="location.href='./';">Cancel</button></label>
    `;
  }

}

function ondragover ( event ) {
  event.preventDefault();
}

function ondragenter ( event ) {
  event.preventDefault();
}

function ondragleave ( event ) {
  event.preventDefault();
}

function ondrop ( event ) {
  const files = [ ...event.dataTransfer.items ];

  event.preventDefault();
  if ( files.length === 1 ) {
    let file = files[ 0 ].getAsFile();
    let url = URL.createObjectURL( file );
    window.avatarFile = file;
    
    avatarPreview.style.backgroundImage = `url( ${ url } )`;
  }
 
}

function onfilechange ( event ) {
  let file = avatarPicker.files[ 0 ];
  

  
  if ( file ) {
    window.avatarFile = file;
    let url = URL.createObjectURL( file );
    avatarPreview.style.backgroundImage = `url( ${ url } )`;
  } else {
    avatarPreview.style.backgroundImage = `url( ${ avatarURL })`;
  }
}

function onsubmitRegister ( event ) {
  fetch( formUser.action, {
    method: formUser.method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      firstName : firstName.value,
      lastName : lastName.value,
      birthDate : birthDate.value,
      email : email.value,
      phone : phone.value,
      about : about.value,
      password : password.value
    })
  });
  if ( window.avatarFile ) {
    console.log( "updating avatar ");
    fetch( `/uploads/${ window.userUID }`, {
      method : formUser.method,
      headers : { 'Content-Type' : window.avatarFile.type },
      body : window.avatarFile
    });
  }
  
  //location.href = formUser.action;
  event.preventDefault();
}

function onsubmitLogin ( event ) {
  fetch( formUser.action, {
    method: formUser.method,
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email : email.value,
      password : password.value
    })
  });
  
  //location.href = formUser.action;
  event.preventDefault();
}

function onsubmitEdit ( event ) {
  fetch( formUser.action, {
    method: formUser.method,
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      firstName : firstName.value,
      lastName : lastName.value,
      birthDate : birthDate.value,
      email : email.value,
      phone : phone.value,
      about : about.value,
    })
  });
  if ( window.avatarFile ) {
    console.log( "updating avatar ");
    fetch( `/uploads/${ window.userUID }`, {
      method : formUser.method,
      headers : { 'Content-Type' : 'image/ipg' },
      body : window.avatarFile
    });
  }
  //location.href = formUser.action;
  event.preventDefault();
}