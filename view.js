export default class View {
  static user = null;
  constructor ( title = "", script = "", style = "", body = "", footer = "" ) {
    this.title = title;
    this.script = script;
    this.style = style;
    this.body = body;
    this.footer = footer;
  }

  cleanup ( ) {
    this.title = "";
    this.body = "";
    this.footer = "";
  }
  addBody ( content ) {
    this.body += content;
  }
  addFooter ( content ) {
    this.footer += content;
  }
  get HTML( ) {
    return `
    <!DOCTYPE html>
      <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta http-equiv="X-UA-Compatible" content="ie=edge">
            <script>${ this.script }</script>
            <style>${ this.style }</style>
            <title>${ this.title }</title>
        </head>
        <body>
          <header>
            <a href="/">Home</a>
            ${ View.user ? `<a href="/users/${ View.user.uid }/view">${ View.user.firstName }</a>` : `<a href="/auth/register">Register</a>` }
            ${ View.user ? `` : `<a href="/auth/login">Login</a>` }
          </header>
          ${ this.body }
          <footer>${ View.user ? this.footer : "" }</footer>
        </body>
      </html>
    `;
  }
}