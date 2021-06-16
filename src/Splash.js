import React, { Component, Fragment } from "react";

export default class Splash extends Component {
  state = {};

  componentDidMount() {
    // wait then fadeout image
    // wait then fadeout logo in middle
    // wait then tweak the line background, then show form
  }

  render() {
    console.log("show consent", this.props.showConsentForm);
    return (
      <div className="splash">
        <h1 className="logo">juno</h1>
        {this.props.showConsentForm ? (
          <div className="consent-form">
            <h2>Consent</h2>
            <p>Before we get started, are you ok with the following?</p>
            <p>We use location data to help you navigate Jupiter Artland. We store your progress with Juno so that we can continue the conversation later. We also use this data to help improve visitor experience.</p>
            <button onClick={this.props.completeConsent}>OK</button>
          </div>
        ) : null}
      </div>
    )
  }
}