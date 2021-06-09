// Copyright © 2021 Kaleido, Inc.
//
// SPDX-License-Identifier: Apache-2.0
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import {
  Button,
  FormControl,
  FormControlLabel,
  Grid,
  makeStyles,
  Paper,
  Switch,
  TextField,
} from '@material-ui/core';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FireFly, FireFlyData, FireFlyMessage } from './firefly';
import ReconnectingWebsocket from 'reconnecting-websocket';

function App() {
  const classes = useStyles();
  const [messages, setMessages] = useState<FireFlyMessage[]>([]);
  const [messageData, setMessageData] = useState<Map<string, FireFlyData>>();
  const [loading, setLoading] = useState<boolean>(true);
  const [messageText, setMessageText] = useState<string>('');
  const ws = useRef<ReconnectingWebsocket | null>(null);

  const firefly = new FireFly(5001);

  const loadMessages = useCallback(async () => {
    const messages = await firefly.getMessages();
    const messageData = new Map<string, FireFlyData>();
    for (const message of messages) {
      for (const data of await firefly.retrieveData(message.data)) {
        messageData.set(data.id, data);
      }
    }
    setMessageData(messageData);
    setMessages(messages);
    setLoading(false);
  }, []);

  const sendBroadcast = () => {
    firefly.sendBroadcast([
      {
        value: messageText,
      },
    ]);
    setMessageText('');
  };

  useEffect(() => {
    if (loading) {
      loadMessages();

      ws.current = new ReconnectingWebsocket(
        'ws://localhost:5000/ws?namespace=default&ephemeral&autoack'
      );
      ws.current.onopen = () => {
        console.log('Websocket connected');
      };
      ws.current.onmessage = () => {
        loadMessages();
      };
      ws.current.onerror = (err: any) => {
        console.error(err);
      };
    }
  });

  return (
    <div className={classes.root}>
      <Grid container spacing={3}>
        <Grid item xs />
        <Grid item xs={12} md={8} xl={4}>
          <Paper
            className={classes.paper}
            component="form"
            onSubmit={(event) => {
              event.preventDefault();
              sendBroadcast();
            }}
          >
            <h1>Send Message</h1>

            <FormControlLabel
              control={
                <Switch
                  checked={true}
                  color="primary"
                  onClick={() =>
                    alert('Private send is not yet supported in this sample.')
                  }
                />
              }
              label="Broadcast to all recipients"
              className={classes.formControl}
            />

            <FormControl className={classes.formControl} fullWidth={true}>
              <TextField
                label="Message"
                variant="outlined"
                value={messageText}
                onChange={(event) => setMessageText(event.target.value)}
              />
            </FormControl>

            <FormControl className={classes.formControlRight}>
              <Button variant="contained" color="primary" type="submit">
                Submit
              </Button>
            </FormControl>

            <div className={classes.clearFix} />
          </Paper>

          <br />

          <Paper className={classes.paper}>
            <h1>Received Messages</h1>

            <MessageList messages={messages} messageData={messageData} />
          </Paper>
        </Grid>
        <Grid item xs />
      </Grid>
    </div>
  );
}

interface MessageListOptions {
  messages: FireFlyMessage[];
  messageData?: Map<string, FireFlyData>;
}

function MessageList(options: MessageListOptions) {
  const { messages, messageData } = options;

  const elements = [];
  for (const message of messages) {
    const data = message.data.map((d) => messageData?.get(d.id));
    elements.push(
      <li key={message.header.id}>
        From {message.local ? 'self' : message.header.author}:&nbsp;
        {JSON.stringify(data.map((d) => d?.value))}
      </li>
    );
  }
  return <ul>{elements}</ul>;
}

const useStyles = makeStyles((theme) => ({
  root: {
    padding: theme.spacing(2),
  },
  paper: {
    padding: theme.spacing(2),
  },
  formControl: {
    marginTop: theme.spacing(2),
  },
  formControlRight: {
    marginTop: theme.spacing(2),
    float: 'right',
  },
  selectEmpty: {
    marginTop: theme.spacing(2),
  },
  upload: {
    display: 'none',
  },
  clearFix: {
    clear: 'both',
  },
}));

export default App;
