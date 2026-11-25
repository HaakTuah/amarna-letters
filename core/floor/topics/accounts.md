# The floor, by topic: accounts, roles and a server

Read when its rule says, and by a security review: the kinds `account` and `security-review`.

**19. Accounts, roles and a server.** Read before a task touches a product's accounts, its roles
or a server of its own; whoever writes or changes code that touches them keeps what follows, in that pull request.
- Who may do what is decided on the side the user cannot alter (never in code or data the user's own device holds),
  and a request is refused unless a rule allows it.
- Signing in goes through the platform's own or a well-known library's, never a scheme of the project's making.
- Nothing cryptographic is of the project's making: each algorithm, protocol and source of randomness for a secret
  comes from the platform or a well-known library.
- A password is stored only through a function made for storing passwords, never a general hash or a cipher.
- It does not mean a product with none of the three takes any of it: a page that runs alone in a browser, with no
  sign-in and no server, needs no access control. Reason: these are where the standard list of risks for web
  applications finds most breaks, and the floor was silent on them.
