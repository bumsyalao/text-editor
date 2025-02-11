[Vercel App](https://vercel.com/bumsyalaos-projects/text-editor)
This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Overview
This Text Editor uses [Draft.js](https://draftjs.org/) to implement a suggestion list autocomplete feature.

### Application logic
- **Autocomplete Process**
- An autocomplete process starts when the characters `<>` are typed. The `match string` is the continuous substring extending from the right of the <> to the caret. This substring must not contain \n.

- **List of Suggestions**
- The autocomplete process uses a debounce of `300ms`, a list of suggestions are displayed below the match string. Every suggestion displayed in the list matches the `match string` prefix. 
- I have hardcode some random suggestions. 
- The suggestions dynamically update in response to the user's input by adding it to the list of suggestions for the next use.
- One suggestion is highlighted at all times. Pressing ‘up’ and ‘down’ arrow keys highlights another suggestion.
- Pressing `enter` or `tab` will select the highlighted suggestion. 
- After selecting a suggestion, the editor displays an "autocompleted entry" instead of the match string. The value of the autocompleted entry is equal to the highlighted suggestion, and if no suggestion was present, the match string is shown.
- Classic mouse interactions can also be used to select and highlight suggestions.

- **Autocompleted Entry**
- An "autocompleted entry" can be entirely removed with one ‘backspace’ key press.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev

```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

