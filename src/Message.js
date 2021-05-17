// @flow
import React, { useEffect } from "react";
import Markdown from "react-markdown";
import breaks from "remark-breaks";
import { formatDistance } from "date-fns";
import classnames from "classnames";
import type { ChatMessage } from "./Chatroom";
import { noop, handleShortcodes, getAllUrlParams } from "./utils";
import Carousel from "./Carousel";

const localMap = {
  "top":55.96995573846374,
  "left":-3.168182373046875,
  "bottom":55.96150096848813,
  "right":-3.15032958984375,
  "latPixel":3.0024041106559784e-06,
  "lngPixel":5.364418029785156e-06,
  "backgroundImage": 'url("/assets/local-map.png"), url("/static/jupiter/assets/local-map.png")'
}

const jupiterMap = {
  "top":55.90842435462327,
  "left":-3.431854248046875,
  "bottom":55.89995614406813,
  "right":-3.41400146484375,
  "latPixel":3.007177043730002e-06,
  "lngPixel":5.364418029785156e-06,
  "backgroundImage": 'url("/assets/jupiter-map.png"), url("/static/jupiter/assets/jupiter-map.png")'
}

type MessageTimeProps = {
  time: number,
  isBot: boolean
};

export const MessageTime = ({ time, isBot }: MessageTimeProps) => {
  if (time === 0) return null;

  const messageTime = Math.min(Date.now(), time);
  const messageTimeObj = new Date(messageTime);
  return (
    <React.Fragment>
    <li
      className={classnames("time", isBot ? "left" : "right")}
      title={messageTimeObj.toISOString()}
    >
      { isBot ? (<span className="bot-avatar"></span>) : (null) }
      <span className="sent"> Sent {formatDistance(messageTimeObj, Date.now())} ago</span>
    </li>
    </React.Fragment>
  );
};

type MessageProps = {
  chat: ChatMessage,
  onButtonClick?: (title: string, payload: string) => void,
  voiceLang?: ?string,
  stickers?: Object
};

const supportSpeechSynthesis = () => "SpeechSynthesisUtterance" in window;

const speak = (message: string, voiceLang: string) => {
  const synth = window.speechSynthesis;
  let voices = [];
  voices = synth.getVoices();
  const toSpeak = new SpeechSynthesisUtterance(message);
  toSpeak.voice = voices.find(voice => voice.lang === voiceLang);
  synth.speak(toSpeak);
};

const Message = ({ chat, onButtonClick, voiceLang = null, stickers = null }: MessageProps) => {
  const message = chat.message;
  const isBot = chat.username === "bot";

  useEffect(() => {
    if (
      isBot &&
      voiceLang != null &&
      message.type === "text" &&
      supportSpeechSynthesis()
    ) {
      speak(message.text, voiceLang);
    }
  }, []);

  switch (message.type) {
    case "locate":
      let hasLocateMessage = (message.locate.message && message.locate.message !== "");
      let finishedLocating = (!onButtonClick);

      useEffect(() => {
        if (onButtonClick) {
          //onButtonClick should only be defined if this was last message
          //useEffect will only run once as if in componentDidMount

          const geolocationOptions = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          };

          const positionUpdateCb = (e) => {
            console.log("Position", e);
            if (window.positionHistory === undefined) { window.positionHistory = []; }
            window.positionHistory.push({
              "location": {
                "accuracy": e.coords.accuracy,
                "altitude": e.coords.altitude,
                "altitudeAccuracy": e.coords.altitudeAccuracy,
                "heading": e.coords.heading,
                "latitude": e.coords.latitude,
                "longitude": e.coords.longitude,
                "speed": e.coords.speed
              },
              "timestamp": new Date - 0
            });
            if (window.positionHistory.length > 5) { window.positionHistory.shift(); }
          };

          const positionError = (e) => { console.error("Position error", e); }

          const checkLatestPosition = (retry) => {
            if (window.positionHistory === undefined) { //no position history, (yet)
              if ((retry) && (window.watchId !== undefined)) {
                setTimeout(checkLatestPosition, 6000, false); //try again
                return;
              } else {
                onButtonClick(message.locate.errorIntent, message.locate.errorIntent);
                return;
              }
            }

            let timeFiltered   = window.positionHistory.filter(p => (((new Date - 0) - p.timestamp)/1000 <= 40));
            let accuracySorted = timeFiltered.sort((a, b) => { return a.location.accuracy - b.location.accuracy; });
            // accuracyFiltered = window.positionHistory.filter(p => p.location.accuracy < 20.0);

            console.log("Time filtered", timeFiltered);
            console.log("Sorted", accuracySorted);

            if (accuracySorted.length > 0) {
              const result = accuracySorted[0];
              onButtonClick(
                `[My location](https://www.openstreetmap.org/?mlat=${result.location.latitude}&mlon=${result.location.longitude}#map=19/${result.location.latitude}/${result.location.longitude})`,
                message.locate.intent + JSON.stringify(result)
              );
            } else {
              console.error("No good positions");
              onButtonClick(message.locate.errorIntent, message.locate.errorIntent);
            }
          };

          if (window.watchId === undefined) {
            //Trigger location watching if it hasn't already started
            console.log("Start watching position");
            window.watchId = navigator.geolocation.watchPosition(positionUpdateCb, positionError, geolocationOptions);
            if (window.watchId = undefined){ window.watchId = 1; } // handle empty return as in some browsers (TODO: research this)
          }

          setTimeout(checkLatestPosition, 6000, true);
        } else {
          console.debug("No need to provide location");
        }
      }, []);

      if (finishedLocating) {
        return null
      } else {
        return (
          <li className={"locate-container"}>
            <span className={"locate-indicator"}></span>
            {hasLocateMessage === true ? (
              <div className="locate-message">
              <Markdown
                source={message.locate.message}
                skipHtml={false}
                allowedTypses={["root", "break"]}
                renderers={{
                  paragraph: ({ children }) => <span>{children}</span>
                }}
                plugins={[breaks]}
              />
              </div>) : null}
          </li>
        )
      }
    case "button":
      return (
        <ul className="chat-buttons">
          {message.buttons.map(({ payload, title, selected }) => (
            <li
              className={classnames("chat-button", {
                "chat-button-selected": selected,
                "chat-button-disabled": !onButtonClick
              })}
              key={payload}
              onClick={
                onButtonClick != null
                  ? () => onButtonClick(title, payload)
                  : noop
              }
            >
              <Markdown
                source={title}
                skipHtml={false}
                allowedTypses={["root", "break"]}
                renderers={{
                  paragraph: ({ children }) => <span>{children}</span>
                }}
                plugins={[breaks]}
              />
            </li>
          ))}
        </ul>
      );
    case "image":
      return (
        <li className={`chat ${isBot ? "left" : "right"} chat-img`}>
          <img src={message.image} alt="" />
        </li>
      );
    case "text":
      let txt = handleShortcodes(stickers, message.text);

      const imageCentre = (map, lat, lng) => {
        const latDiff = Math.abs(localMap.top) - Math.abs(lat);
        const lngDiff = Math.abs(localMap.left) - Math.abs(lng);
        const downwards  = (latDiff / localMap.latPixel);
        const rightwards = (lngDiff / localMap.lngPixel);
        return [Math.abs(downwards), Math.abs(rightwards)];
      }

      const isWithinBounds = (lat, lng, mapDetails) => {
        return ((lng >= mapDetails.left) && (lng <= mapDetails.right)) && ((lat <= mapDetails.top) && (lat >= mapDetails.bottom));
      }

      const styleBackground = (urlParams) => {
        if ((urlParams.mlat === undefined) && (urlParams.mlon === undefined)) { return {}; }

        const lat = Number(urlParams.mlat);
        const lng = Number(urlParams.mlon);

        let mapDetails = {};

        if (isWithinBounds(lat, lng, localMap)) {
          mapDetails = localMap;
        } else if (isWithinBounds(lat, lng, jupiterMap)) {
          mapDetails = jupiterMap;
        } else {
          return {}
        }

        const centering = imageCentre(mapDetails, lat, lng);
        const sizing = window.innerWidth / 2;
        let customStyle = {};
        customStyle["width"]  = sizing;
        customStyle["height"] = sizing;
        customStyle["backgroundPositionY"] = (centering[0] * -1) + sizing/2;
        customStyle["backgroundPositionX"] = (centering[1] * -1) + sizing/2;
        customStyle["backgroundSize"] = "unset";
        customStyle["backgroundImage"] = mapDetails.backgroundImage;
        return customStyle;
      }

      const linkRenderer = ({ href, children }) => {
        let customStyle = styleBackground(getAllUrlParams(href));
        return (<a href={href} style={customStyle} target="_blank">
          {children}
        </a>)
      }

      return (
        <li className={classnames("chat", isBot ? "left" : "right")}>
          <Markdown
            className="text"
            source={txt}
            skipHtml={false}
            allowedTypes={[
              "root",
              "break",
              "blockquote",
              "paragraph",
              "emphasis",
              "strong",
              "link",
              "list",
              "listItem",
              "image"
            ]}
            renderers={{
              paragraph: ({ children }) => <span>{children}</span>,
              link: linkRenderer
            }}
            plugins={[breaks]}
          />
        </li>
      );
    case "carousel":
      return (
        <Carousel carousel={message.carousel} onButtonClick={onButtonClick} />
      )
    default:
      return null;
  }
};

export default Message;
