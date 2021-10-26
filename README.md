# GRPC Session - alpha

## Installation:
```
yarn add @asfweb/grpc-session
```
or
```
npm install @asfweb/grpc-session --save
```

## Usage:

```
// Sessions.ts

import { Session, SessionRedisStore } from "@asfweb/grpc-session";

// Creates session store
const sessionStore = new SessionRedisStore({ password: "12345" });

// Creates session object
const session = new Session(sessionStore, { expires: 60 * 30 /* In seconds: 60 seconds * 30 = 30 min. */ });

export default session;
```

#### Create session:
```
// AuthServices.ts
import Session from "../lib/Session";

export const AuthService: AuthServiceHandlers = {
  Login: async (_call, callback) => {
    
    ...other code
    // Creates new session and saves it in the store
    await Session.start({ userId: 10 }).save();

    return callback(null, {
      sessionId: Session.sessionId,
    });
  },
};

export default AuthService;
```

#### Validate session

```
// SomeService.ts
import Session from "../lib/Session";

export const SomeService: SomeServiceHandlers = {
  ListSome: async ({ metadata }, callback) => {
    try {
        // Expecting metadata['cookies'] = '_SID=9213023981'; 
        // Checks if session exist in the store, 
        // throws an error if it doesn't
        await Session.validate(metadata);

        // Add Session Data
        // chained
        await Session
        .set('someKey', 'someValue')
        .set('anotherKey', 'anotherValue')
        .save();
        // or
        Session.set('key1', 'value1');
        Session.set('key2', 'value2');
        // NOTE: Save must be executed after set in order to persist session data
        await Session.save(); 

        // Get Session Data
        let someKey = Session.get('someKey');
        console.log(someKey);

        // Get all data
        let sessionData = Session.get();
        console.log(sessionData);

        return callback(null, {...});

    } catch (err) {
      if (err instanceof Error) {
        return callback(
          { code: grpc.status.INTERNAL, message: err.message },
          null
        );
      }
    }
  }
};

export default SomeService;

```

#### TODO:
- SessionFileStore
- SessionMongoStore
- SessionMysqlStore
- SessionSharedConfig