const Amplify = require('@aws-amplify/core');
const {Auth} = require('@aws-amplify/auth');
global.fetch = require('node-fetch');

const {region} = require('./cognito.config');

const readline = require('readline');
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function questionAsync(query) {
    return new Promise((resolve, reject) => {
        rl.question(query, (answer) => resolve(answer));
    })
    .finally(() => rl.close());
}

const { program } = require('commander');
program.version('0.0.1');

async function processChallenge(user) {
    if (user.challengeName == null) {
        return user;
    }

    switch (user.challengeName) {
        case 'NEW_PASSWORD_REQUIRED':
            return await completePassword(user);
        default:
            console.log('Unrecognized challengeName in user response');
            return user;
    }
}

async function completePassword(user) {
    console.log('> A new password is required to continue...');

    const newPassword = await questionAsync('Type new password: ');

    try {
        const loggedInUser = await Auth.completeNewPassword(user, newPassword, {name: "User Name"});
        return await processChallenge(loggedInUser);
    } catch(err) {
        console.log(err);
    }
}

async function signIn(poolId, clientId, username) {
    console.log(`Signin at pool: ${poolId}, with user: ${username}`);

    Amplify.default.configure({
        region: region,
        userPoolId: poolId,
        userPoolWebClientId: clientId
    });

    const password = await questionAsync(`Type ${username} password: `);

    try {
        const signInResponse = await Auth.signIn(username, password);
        const user = await processChallenge(signInResponse);
        console.log(`jwt token: ${user["signInUserSession"]["idToken"]["jwtToken"]}`);
    } catch(err) {
        console.log(err);
    }
}

async function main() {
    program
        .command('signin <poolId> <clientId> <username>')
        .option('-r --region <value>', 'override default region from cognito.config.js file')
        .description('sing in with the provided credentials and return jwt string')
        .action(signIn);

    await program.parseAsync(process.argv);
}

main();

