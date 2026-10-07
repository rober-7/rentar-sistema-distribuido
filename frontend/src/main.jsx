import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  ApolloClient,
  InMemoryCache,
  ApolloLink,
  HttpLink,
} from "@apollo/client";
import { ApolloProvider } from "@apollo/client/react";
import "bootstrap/dist/css/bootstrap.min.css";
import "./template/css/styles.css";
import "./index.css";
import App from "./App.jsx";
import { token } from "./utils/auth";
const authLink = new ApolloLink((operation, forward) => {
  operation.setContext(({ headers = {} }) => ({
    headers: {
      ...headers,
      ...(token() ? { authorization: `Bearer ${token()}` } : {}),
    },
  }));
  return forward(operation);
});
const client = new ApolloClient({
  link: authLink.concat(new HttpLink({ uri: "http://localhost:3000/graphql" })),
  cache: new InMemoryCache(),
});
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ApolloProvider client={client}>
      <App />
    </ApolloProvider>
  </StrictMode>,
);
