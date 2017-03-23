# git-haiku-bot
> ☯️  Git Commit Haikus in Tweet form

See it in action: https://twitter.com/GitHaiku

## Configuration

1. Copy the `.env` template

    ```
    cp .env.template .env
    ```

2. [Create](https://apps.twitter.com/) a Twitter app and note your credentials.
3. Use the credentials from the last step to fill in the following fields in  `.env`:
    * `CONSUMER_KEY`
    * `CONSUMER_SECRET`
    * `ACCESS_TOKEN`
    * `ACCESS_TOKEN_SECRET`

## Usage

### Local Usage

First, install dependencies:

```
npm install
```

Local usage:

```
Usage: git-haiku-bot [options] [command]


Commands:

generate   Generates a haiku
post       Posts a git haiku

Options:

-h, --help  output usage information
```

Example:

```
$ ./git-haiku-bot generate

Number of features
What changes were proposed
The keys times out when

via apache/spark
```

### AWS Lambda Deployment

1. Build the .zip package:

    ```
    npm run package
    ```

2. Upload `./build/git-haiku-bot.zip` to Lambda
3. Setup a CloudWatch Schedule with a `rate(1 hour)` activation schedule.
