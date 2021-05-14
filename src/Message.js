// @flow
import React, { useEffect } from "react";
import Markdown from "react-markdown";
import breaks from "remark-breaks";
import { formatDistance } from "date-fns";
import classnames from "classnames";
import type { ChatMessage } from "./Chatroom";
import { noop, handleShortcodes, getAllUrlParams } from "./utils";
import Carousel from "./Carousel";

const oldLocalMap = {
  top: 55.96704361504013,
  left: -3.168021440505982,
  right: -3.1590628623962407,
  bottom: 55.96435646138302,
  latPixel: 0.0000019003915538285598,
  lngPixel: 0.0000033959735063461756
};

const localMap = {
  "top":55.96995573846374,
  "left":-3.168182373046875,
  "bottom":55.96150096848813,
  "right":-3.15032958984375,
  "latPixel":3.0024041106559784e-06,
  "lngPixel":5.364418029785156e-06,
  "image": "/assets/local-map.png"
}

const jupiterMap = {
  "top":55.90842435462327,
  "left":-3.431854248046875,
  "bottom":55.89995614406813,
  "right":-3.41400146484375,
  "latPixel":3.007177043730002e-06,
  "lngPixel":5.364418029785156e-06,
  "image": "/assets/jupiter-map.png"
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

          let retries = 3;
          let result;
          const geolocationOptions = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          };

          const submitResult = (result) => {
            onButtonClick(
              `[My location](https://www.openstreetmap.org/?mlat=${result.location.latitude}&mlon=${result.location.longitude}#map=19/${result.location.latitude}/${result.location.longitude})`,
              message.locate.intent + JSON.stringify(result)
            );
          };

          const unableToLocate = (e) => {
            console.error("Couldn't find location", e);
            const hasRecentResult = (((new Date - 0) - result.timestamp)/1000 <= 20);
            if (hasRecentResult) {
              console.log("Using a recent result", result);
              submitResult(result);
            } else {
              onButtonClick(message.locate.errorIntent, message.locate.errorIntent);
            }
          };

          const retrievedLocation = (e) => {
            result = {
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
            };

            retries--;
            console.log("Number of retries", retries, "accuracy", result.location.accuracy);
            if ((result.location.accuracy < 20.0) || (retries === 0)) {
              submitResult(result);
            } else {
              console.log("Accuracy not enough, retrying", e);
              navigator.geolocation.getCurrentPosition(retrievedLocation, unableToLocate, geolocationOptions);
            }
          };

          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(retrievedLocation, unableToLocate, geolocationOptions);
          } else {
            console.log("Browser doesnt support geolocation");
            onButtonClick(message.locate.errorIntent, message.locate.errorIntent);
          }
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
        customStyle["backgroundImage"] = 'url("'+ mapDetails.image +'")';
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
