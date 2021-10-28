# GRPC Session - alpha

## Installation:
```TypeScript
yarn add @asfweb/grpc-session
```
or
```
npm install @asfweb/grpc-session --save
```

## Usage:

```TypeScript
// Sessions.ts

import { Session, SessionRedisStore } from "@asfweb/grpc-session";

// Creates session store
const sessionStore = new SessionRedisStore({ password: "12345" });

// Creates session object
const session = new Session(sessionStore, { expires: 60 * 30 /* In seconds: 60 seconds * 30 = 30 min. */ });

export default session;
```

#### Create session:
```TypeScript
// AuthServices.ts
import Session from "../lib/Session";

export const AuthService: AuthServiceHandlers = {
  Login: async (_call, callback) => {
    
    // Init Session
    await Session.gRPC(call);

    // After session is started, you can save, remove data from it 
    await Session.set('key', {test:1}).set('test2', true).save();
 
    ...other code

    return callback(null, {
        session: Session.get()
    });
  },
};

export default AuthService;
```

#### Validate session

```TypeScript
// SomeService.ts
import Session from "../lib/Session";

export const SomeService: SomeServiceHandlers = {
  ListSome: async ({ metadata }, callback) => {
    try {
        // Init Session
        await Session.gRPC(call);

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