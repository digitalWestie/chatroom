// @flow
import type { TrackerState } from "./DebuggerView";
import { uuidv4 } from "./utils";

export const fetchTracker = (host:string, userId:string, rasaToken:?string): Promise<TrackerState> => {
  if (rasaToken) {
    return fetch(
      `${host}/conversations/${userId}/tracker?token=${rasaToken}`
    ).then(res => res.json());
  } else {
    throw Error(
      'Rasa Auth Token is missing or other issue. Start your bot with the REST API enabled and specify an auth token. E.g. --enable_api --cors "*" --auth_token abc'
    );
  }
}

export const extractMessages = (tracker) => {
  let messages = []; let msgDetail = {};
  let messageObj = {};
  for (event of tracker.events){
    if (["user", "bot"].includes(event.event)) {
      messageObj = {
        time: Math.round(event.timestamp * 1000),
        username: event.event,
        uuid: event.message_id,
        message: {}
      }

      if (event.text){
        msgDetail = { type: "text", text: event.text };
        messages.push({ ...messageObj, message: msgDetail });
      }

      //text may come with button or other so add these as as separate message
      if (event.data && event.data.buttons) {
        msgDetail = { type: "button", buttons: event.data.buttons };
        messages.push({ ...messageObj, message: msgDetail });
      } else if (event.data && event.data.image) {
        msgDetail = { type: "image", image: event.data.image };
        messages.push({ ...messageObj, message: msgDetail });
      } else if (event.data && event.data.attachment) {
        msgDetail = { type: "text", text: event.data.attachment };
        messages.push({ ...messageObj, message: msgDetail });
      } else if (event.data && event.data.custom) { // && event.data.custom.handoff_host
        console.error("Not yet implemented (handling of custom handoff event)");
      }
    }
  }

  return messages;
}