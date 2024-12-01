import { PassedInitialConfig } from 'angular-auth-oidc-client';

export const authConfig: PassedInitialConfig = {
  config: {
            authority: 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_GogUUkX9M',
            redirectUrl: window.location.origin,
            postLogoutRedirectUri: window.location.origin,
            clientId: 'please-enter-clientId',
            usePushedAuthorisationRequests: true,
            scope: 'email openid phone profile offline_access', 
            responseType: 'code',
            silentRenew: true,
            useRefreshToken: true,
            ignoreNonceAfterRefresh: true,
            customParamsAuthRequest: {
              prompt: 'consent', // login, consent
            },
    }
}
