import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/api';

// Configuração do AWS Amplify com AppSync GraphQL
const endpoint = process.env.NEXT_PUBLIC_APPSYNC_ENDPOINT || 'SEU_ENDPOINT_APPSYNC';
const region = process.env.NEXT_PUBLIC_APPSYNC_REGION || process.env.AWS_REGION || 'sa-east-1';
const apiKey = process.env.NEXT_PUBLIC_APPSYNC_API_KEY || 'SUA_API_KEY';

Amplify.configure({
  API: {
    GraphQL: {
      endpoint: endpoint,
      region: region,
      defaultAuthMode: 'apiKey',
      apiKey: apiKey,
    },
  },
});

export const client = generateClient();

