import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { Authenticator } from "@aws-amplify/ui-react";
import { Amplify } from "aws-amplify";
import { fetchAuthSession } from "aws-amplify/auth";
import App from "./App.tsx";
import DemoApp from "./DemoApp.tsx";
import outputs from "../amplify_outputs.json";
import "@aws-amplify/ui-react/styles.css";
import "./index.css";

Amplify.configure(outputs);

function Root() {
  // null = checking, false = show demo, true = show auth
  const [showAuth, setShowAuth] = useState<boolean | null>(null);

  useEffect(() => {
    fetchAuthSession()
      .then((session) => {
        const loggedIn = !!session.tokens?.accessToken;
        setShowAuth(loggedIn);
      })
      .catch(() => setShowAuth(false));
  }, []);

  if (showAuth === null) return null;

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
