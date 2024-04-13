# GeoTraceRTC

## Getting a MapBox Token.

Go to this link and create a MapBox account: https://account.mapbox.com/auth/signup/?route-to=%22https%3A%2F%2Faccount.mapbox.com%2F%22

Once you create the the account this link takes you to creating a token: https://account.mapbox.com/access-tokens/create/

## Running the release version.

Create a file inside `geo-trace-rtc\resources` called `.env`

It should have one value

```
MAP_BOX_TOKEN=YOUR_MAP_BOX_API_GOES_HERE
```

## Building and running the app.

Rust and npm needs installed:

Installing Rustup to get the cargo toolchain: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`

Install node.js: https://nodejs.org/en/download/current

Create a file in the location `./GeoTraceRTC/' named '.env'

It should have one value

```
MAP_BOX_TOKEN=YOUR_MAP_BOX_API_GOES_HERE
```

Running the UI

```
cd GeoTraceRTC
npm install
npm run start
```

## The Rust API is now added to the code and you no longer need to worry about running it

Running the API parser

```
cd log-parser
cargo run
```