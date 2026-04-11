import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import { Authenticator } from "@aws-amplify/ui-react";
import { Amplify } from "aws-amplify";
import App from "./App.tsx";
import DemoApp from "./DemoApp.tsx";
import outputs from "../amplify_outputs.json";
import "@aws-amplify/ui-react/styles.css";
import "./index.css";

Amplify.configure(outputs);

function Root() {
  const [showAuth, setShowAuth] = useState(false);

  if (showAuth) {
    return (
      <Authenticator>
        <App />
      </Authenticator>
    );
  }

  return <DemoApp onLogin={() => setShowAuth(true)} />;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
