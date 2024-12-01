import { Injectable } from '@angular/core';
import { CognitoUserPool, CognitoUser, CognitoUserSession, AuthenticationDetails } from 'amazon-cognito-identity-js';
import { signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import { UserAttributes } from '../../models/auth.model';

@Injectable({
  providedIn: 'root',
})
export class CognitoService {
  private cognitoUserPool: CognitoUserPool;
  public currentUserSignal = signal<any>(null);

  constructor() {
    this.cognitoUserPool = new CognitoUserPool({
      UserPoolId: environment.USER_POOL_ID,
      ClientId: environment.APP_CLIENT_ID,
    });

    // Attempt to load user from sessionStorage upon initialization
    if (this.isBrowser()) {
      this.loadUserFromStorage();
    }
  }

  private isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof sessionStorage !== 'undefined';
  }

  private loadUserFromStorage(): void {
    if (!this.isBrowser()) {
      return;
    }
    const idToken = sessionStorage.getItem('idToken');
    const username = sessionStorage.getItem('username');
    const tokenExpiration = sessionStorage.getItem('tokenExpiration');
    const firstName = sessionStorage.getItem('firstName');

    if (idToken && tokenExpiration && Date.now() < Number(tokenExpiration) * 1000) {
      this.currentUserSignal.set({ idToken, username, tokenExpiration, firstName });
    } else {
      this.clearUserData();
    }
  }

  signIn(username: string, password: string): Promise<any> {
    const user = new CognitoUser({
      Username: username,
      Pool: this.cognitoUserPool,
    });
  
    const authDetails = new AuthenticationDetails({
      Username: username,
      Password: password,
    });
  
    return new Promise((resolve, reject) => {
      user.authenticateUser(authDetails, {
        onSuccess: (session) => {
          const idToken: string = session.getIdToken().getJwtToken();
          const tokens = {
            idToken,
            accessToken: session.getAccessToken().getJwtToken(),
            refreshToken: session.getRefreshToken().getToken(),
            tokenExpiration: session.getIdToken().getExpiration(),
            username,
            firstName: this.getJwtPayload(idToken).given_name,
          };
  
          this.storeUserData(tokens);
          this.currentUserSignal.set(tokens);  // Directly set the signal here
          resolve(session);
        },
        onFailure: (err) => {
          reject(err);
        },
        newPasswordRequired: (userAttributes: UserAttributes, requiredAttributes: string[]) => {
          const mutableAttributes: UserAttributes = userAttributes
            ? Object.entries(userAttributes)
                .filter(([key]) => key !== 'email_verified')
                .filter(([key]) => key !== 'email')
                .reduce((acc: UserAttributes, [key, value]) => {
                  acc[key as keyof UserAttributes] = value;
                  return acc;
                }, {})
            : {};
  
          const newPassword = prompt('Your password has expired. Please enter a new password.');
  
          if (newPassword) {
            user.completeNewPasswordChallenge(newPassword, mutableAttributes, {
              onSuccess: (session) => {
                const idToken: string = session.getIdToken().getJwtToken();
                const tokens = {
                  idToken,
                  accessToken: session.getAccessToken().getJwtToken(),
                  refreshToken: session.getRefreshToken().getToken(),
                  tokenExpiration: session.getIdToken().getExpiration(),
                  username,
                  firstName: this.getJwtPayload(idToken).given_name,
                };
  
                this.storeUserData(tokens);
                this.currentUserSignal.set(tokens);  // Directly set the signal here
                resolve(session);
              },
              onFailure: (err) => {
                reject(err);
              },
            });
          } else {
            reject('Password change canceled');
          }
        },
      });
    });
  }
  


  private storeUserData(user: {
    idToken: string;
    accessToken: string;
    refreshToken: string;
    tokenExpiration: number;
    username: string;
    firstName: string;
  }): void {
    if (!this.isBrowser()) {
      return;
    }
    sessionStorage.setItem('idToken', user.idToken);
    sessionStorage.setItem('accessToken', user.accessToken);
    sessionStorage.setItem('refreshToken', user.refreshToken);
    sessionStorage.setItem('username', user.username);
    sessionStorage.setItem('tokenExpiration', user.tokenExpiration.toString());
    sessionStorage.setItem('firstName', user.firstName);
  }

  public clearUserData(): void {
    if (!this.isBrowser()) {
      return;
    }
    sessionStorage.clear();
    this.currentUserSignal.set(null);
  }

  private getJwtPayload(token: string): any {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const decodedString = new TextDecoder().decode(Uint8Array.from(atob(base64), (c) => c.charCodeAt(0)));
    return JSON.parse(decodedString);
  }

  public validateSession(): Promise<boolean> {
    const currentUserData = this.currentUserSignal();
    return Promise.resolve(
      currentUserData?.idToken && currentUserData?.tokenExpiration && Date.now() < Number(currentUserData.tokenExpiration) * 1000
    );
  }

  public getAuthToken(): string | null {
    const currentUserData = this.currentUserSignal();
    return currentUserData?.idToken || null;
  }

  public confirmSignUp(verificationCode: string): Promise<any> {
    const currentUser = this.cognitoUserPool.getCurrentUser();
    if (!currentUser) {
      return Promise.reject('No user found');
    }

    return new Promise((resolve, reject) => {
      currentUser.confirmRegistration(verificationCode, true, (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    });
  }
}
