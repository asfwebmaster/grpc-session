# GRPC Session - Beta

## Installation:
```
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

// Creates session
const session = new Session(sessionStore, { expires: 60 * 30 /* In seconds: 60 seconds * 30 = 30 min. */ });

export default session;
```

#### Auth Service:
```TypeScript
// AuthService.ts
import path from "path";
import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import { ProtoGrpcType } from "./proto/auth";
import Session from "./lib/Session";

const PORT = 9060;
const PROTO_FILE = "./proto/auth.proto";

const packageDef = protoLoader.loadSync(path.resolve(__dirname, PROTO_FILE));
const grpcObj = grpc.loadPackageDefinition(
  packageDef
) as unknown as ProtoGrpcType;
const authPackage = grpcObj.auth.v1;

function main() {
  const server = getServer();
  server.bindAsync(
    `0.0.0.0:${PORT}`,
    grpc.ServerCredentials.createInsecure(),
    (err, port) => {
      if (err) {
        console.error(err);
        return;
      }
      console.log(`Your auth server has started on port ${port}`);
      server.start();
    }
  );
}

function getServer() {
  const server = new grpc.Server();
  server.addService(authPackage.AuthService.service, {
  Login: async (call, callback) => {

    // Check for existing session or create new one if doesn't exist
    await Session.gRPC(call);

    // Save some data in session
    await Session.set("userId", 10).save();
    
    return callback(null, {
      sessionId: Session.id(),
    });
  },
});

  return server;
}

main();
```

#### Some Service

```TypeScript
// SomeService.ts 
import path from "path";
import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import { ProtoGrpcType } from "./proto/some";

const PORT = 9070;
const PROTO_FILE = "../../proto/some.proto";

const packageDef = protoLoader.loadSync(path.resolve(__dirname, PROTO_FILE));

const grpcObj = grpc.loadPackageDefinition(
  packageDef
) as unknown as ProtoGrpcType;
const grpcPackage = grpcObj.some.v1;

function main() {
  const server = getServer();
  server.bindAsync(
    `0.0.0.0:${PORT}`,
    grpc.ServerCredentials.createInsecure(),
    (err, port) => {
      if (err) {
        console.error(err);
        return;
      }
      console.log(`Your some server as started on port ${port}`);
      server.start();
    }
  );
}

/**
 * Creates a gRPC server
 *
 * @returns gRPC Server
 */
function getServer() {
  const server = new grpc.Server();

  // Add Services Here
  server.addService(grpcPackage.SomeService.service, {
  ListSome: async (call, callback) => {
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
});

  return server;
}

// Start
main();
```

#### TODO:
- SessionFileStore
- SessionMongoStore
- SessionMysqlStore
- SessionSharedConfig