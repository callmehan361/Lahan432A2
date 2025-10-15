import { CognitoUserPool, CognitoUser, AuthenticationDetails } from 'amazon-cognito-identity-js';

const poolData = {
  UserPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
  ClientId: import.meta.env.VITE_COGNITO_CLIENT_ID
};

const userPool = new CognitoUserPool(poolData);

export async function login(username, password) {
  return new Promise((resolve, reject) => {
    const authDetails = new AuthenticationDetails({ Username: username, Password: password });
    const user = new CognitoUser({ Username: username, Pool: userPool });

    user.authenticateUser(authDetails, {
      onSuccess: (result) => {
        const token = result.getIdToken().getJwtToken();
        localStorage.setItem('id_token', token);
        console.log('Login successful');
        resolve(token);
      },
      onFailure: (err) => {
        alert('Login failed: ' + err.message);
        reject(err);
      }
    });
  });
}

export function getToken() {
  return localStorage.getItem('id_token');
}
