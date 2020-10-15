// @flow
import type { TrackerState } from "./DebuggerView";

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
  console.log("Extracting messages from tracker", tracker);
  let messages = []; let msgDetail = {};
  for (event of tracker.events){
    if (["user", "bot"].includes(event.event)){
      if (event.text){
        msgDetail = { type: "text", text: event.text };
      } else if (event.buttons) {
        msgDetail = { type: "buttons", text: event.buttons };
      } else if (event.image) {
        msgDetail = { type: "image", text: event.image };
      } else if (event.attachment) {
        msgDetail = { type: "text", text: event.attachment };
      } else if (event.custom && event.custom.handoff_host) {
        throw Error("Not yet implemented (handling of custom handoff event)");
      } else {
        throw Error("Could not parse message from Bot or empty message");
      }

      messages.push({
        message: msgDetail,
        time: Math.round(event.timestamp * 1000), //need to convert from 1602759595.31963 to 1602760664680 format
        username: event.event,
        uuid: event.message_id
      });
    }
  }
  return messages;
}