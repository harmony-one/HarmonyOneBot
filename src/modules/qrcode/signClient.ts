import SignClient from "@walletconnect/sign-client";
import config from "../../config";

let client: SignClient | null = null;

export const getSignClient = async () => {
  if (client) {
    return client;
  }

  const signClient = await SignClient.init({
    projectId: config.walletConnect.projectId,
    metadata: {
      name: "HarmonyOneBot",
      description: "HarmonyOneBot",
      url: "https://h.country",
      icons: ["https://cryptologos.cc/logos/harmony-one-logo.png?v=026"],
    },
  });

  signClient.on('session_event', (event) => {
    console.log('### event', event);
    // Handle session events, such as "chainChanged", "accountsChanged", etc.
  })

  signClient.on('session_update', ({ topic, params }) => {
    const { namespaces } = params
    const _session = signClient.session.get(topic)
    // Overwrite the `namespaces` of the existing session with the incoming one.
    const updatedSession = { ..._session, namespaces }
    // Integrate the updated session state into your dapp state.
    // onSessionUpdate(updatedSession)
  })

  signClient.on('session_delete', () => {
    console.log('### session delete');

    // Session was deleted -> reset the dapp state, clean up from user session, etc.
  })

  client = signClient;

  return client;
}

getSignClient();