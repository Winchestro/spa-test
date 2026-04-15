export default class Post {
  #authorRef;
  #authorized;
  #editing;
  author;
  uid;
  date;
  content;

  photos = [];

  constructor ( uid, authorUID, date, content, photos = [] ) {
    this.uid = uid;
    this.author = authorUID;
    this.date = date;
    this.content = content;
    this.photos = photos;
  }

  fromJSON ( obj ) {
    if( obj ) {
      this.uid      = obj.uid;
      this.author   = obj.authorUID;
      this.date     = new Date( obj.date );
      this.content  = obj.content;
      this.photos   = JSON.parse( obj.photos );
      return this;
    }
  }

  get isAuthorized ( ) {
    return this.#authorized;
  }

  isAuthoredBy ( user ) {
    if ( !user ) return false;
    return this.#authorRef.uid === user.uid;
  }

  updateAuthorization ( user ) {
    if ( this.isAuthoredBy( user ) ) this.#authorized = true;
    else this.#authorized = false;
    return this;
  }

  resolveAuthorref ( user ) {
    this.#authorRef = user;
    return this;
  }

  get href () {
    return this.#authorRef.uid;
  }

  get name () {
    return this.#authorRef.firstName;
  }

  get dateIntl () {
    if ( isNaN( this.date.getTime() ) ) return "Invalid Date";
    if ( !( this.date instanceof Date ) ) this.date = new Date( this.date );
    return Intl.DateTimeFormat( "en-US", { 
      dateStyle : "medium",
      timeStyle : "medium"
    } ).format( this.date );
  }

  get HTMLView ( ) {
    return `
      <article>
        ${ this.#authorized ? `<a href='/posts/${ this.uid }/edit'>Edit</a><a href="./" onclick=fetch('/posts/${ this.uid }/delete')>Delete</a>` : "" }
        <a class="avatar button" style="background-image: url('/uploads/${ this.author }.jfif');" href= "/users/${ this.#authorRef.uid }/view" >${ this.#authorRef.firstName }</a>
        <time datetime="${ this.date }">${ this.dateIntl }</time>
        <p>${ this.content }</p>
      </article>
    `;
  }

  static get HTMLWrite ( ) {
    return `
      <article>
      <form action="/posts/" id="formPost" method="post">
        <script>formPost.addEventListener("submit", ${ onsubmit } );</script>
          <textarea id="contentArea" id="content" rows="5" cols="30" ></textarea>
        <label for="submit"><input id="submit" type="submit"></input></label>
        <label for="cancel"><button id="cancel" onclick="location.href='/';">Cancel</button></label>
      </form>
      </article>
    `;
  }

  get HTMLEdit () {
    return `
      <article>
      <form id="formPost">
        <script>formPost.addEventListener("submit", ${ onsubmit } );</script>
          <textarea id="contentArea" rows="5" cols="30" >${ this.content }</textarea>
        <label for="submit"><button id="submit">Submit</button></label>
        <label for="cancel"><button id="cancel" onclick="location.reload();">Cancel</button></label>
      </form>
      </article>
    `;
  }
}


function onsubmit ( event ) {
  event.preventDefault();

  fetch( formPost.action, {
    method: "post",
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      content : contentArea.value
    })
  });
  location.href = "/";
  
}