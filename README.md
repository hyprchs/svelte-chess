# Svelte-chess: Playable chess component 

Fully playable chess component for Svelte.
Powered by
[@jacksonthall22/chess.ts](https://www.npmjs.com/package/@jacksonthall22/chess.ts) logic,
[Chessground](https://github.com/lichess-org/chessground) chessboard
and optionally [Stockfish](https://github.com/official-stockfish/Stockfish) chess AI.

![Svelte-chess screenshots](https://github.com/gtim/svelte-chess/blob/main/static/screenshot.png?raw=true)

## Features

* Track game state via props or detailed events
* Bind to a [`chess.ts`](https://www.npmjs.com/package/@jacksonthall22/chess.ts) `Board` object
* Play against Stockfish
* Undo moves
* Pawn promotion dialog
* Fully restylable
* Typed

## Usage 

Installation:

```sh
npm install @jacksonthall22/svelte-chess
```

Basic playable chessboard ([REPL](https://svelte.dev/repl/b1a489538165489aa2720a65b476a58b?version=3.59.1)):

```svelte
<script>
  import { Chess } from '@jacksonthall22/svelte-chess'
</script>    
<Chess />
```

Interact with the game via [props](#props), [methods](#methods) or [events](#events).

### Props

Game state can be observed by binding to props. 

| Prop               | Bindable and readable | Writable | Value                                                                                    |
| ------------------ | :-------------------: | :------: | -----------------------------------------------------------------------------------------|
| `board`            |           ✓           |    ✓     | Current position in [FEN](https://www.chessprogramming.org/Forsyth-Edwards_Notation)    |
| `orientation`      |           ✓           |    ✓     | Orientation of the board (`true` = w, `false` = b).                                     |
| `animationEnabled` |           ✓           |    ✓     | Animate when updating position. Can also be passed manually to `setBoard()`/`setFen()`. |
| `engine`           |                       |    ✓     | Options for the Stockfish chess AI. See [Engine](#engine--stockfish).                   |
| `class`            |                       |    ✓     | CSS class applied to children instead of default (see [Styling](#styling)).             |

All readable props are bindable and updated whenever the game state changes.
Writable props are only used when the component is created.

Example using bindable props to monitor state ([REPL](https://svelte.dev/repl/d0ec69dde1f84390ac8b4d5746db9505?version=3.59.1)):

```svelte
<script lang='ts'>
  import { Chess } from '@jacksonthall22/svelte-chess'
  import * as chess from '@jacksonthall22/chess.ts'

  let board = new chess.Board()

  let sanHistory: string[] = []
  $: {
    board = board
    const tempBoard = new Board()
    sanHistory = board.moveStack.map(move => tempBoard.sanAndPush(move))
  }
</script>
<Chess bind:board />
<p>
  It's move {board.fullmoveNumber} with {chess.COLOR_NAMES[chess.colorIdx(board.turn)]} to move.
  Moves played: {sanHistory.join(' ')}
</p>
```

Starting from a specific FEN ([REPL](https://svelte.dev/repl/ebce18a71d774b2db987abc71f45648a?version=3.59.1)):

```svelte
<script lang='ts'>
  import { Board } from '@jacksonthall22/chess.ts'
  import { Chess } from '@jacksonthall22/svelte-chess'

  let board = new Board("rnbqkb1r/1p2pppp/p2p1n2/8/3NP3/2N5/PPP2PPP/R1BQKB1R w KQkq - 0 6")
</script>
<Chess board={board} />
```

### Methods

The board state can be read and manipulated via method calls to the Chess component itself. 


Methods for manipulating game/board state:

* `push( move: chess.Move )`: Make a move programmatically. Argument is a move object, e.g. `chess.Move.fromUci('e2e4')`. Throws an error if the move is illegal or malformed.
* `pushUci( uci: string )`: Make a move programmatically from the UCI, e.g. `'e2e4'`.
* `pushSan( san: string )`: Make a move programmatically from the SAN, e.g. `'e4'`.
* `setBoard( board: chess.Board )`: Loads a position from a new `chess.Board` object.
* `setFen( fen: string )`: Loads a position from a FEN. Throws an error if the FEN could not be parsed.
* `reset()`: Loads the starting position.
* `pop()`: Pops and returns the last `chess.Move` from the board's move stack.
* `toggleOrientation()`: Flips the board.
* `makeEngineMove()`: Make the best move according to the engine. See [Engine / Stockfish](#engine--stockfish) for loading the engine.

Example implementing undo/reset buttons ([REPL](https://svelte.dev/repl/7dd7b6454b12466e90ac78a842151311?version=3.59.1)):

```svelte
<script>
  import { Chess } from '@jacksonthall22/svelte-chess'
  let chess;
</script>    
<Chess bind:this={chess}/>
<button on:click={()=>chess?.reset()}>Reset</button>
<button on:click={()=>chess?.pop()}>Undo</button>
```

### Events

A `ready` event is dispatched when the Chess component is ready for interaction,
which is generally immediately on mount. If an [engine](#engine--stockfish) was
specified, the event is dispatched after engine initialisation, which might take
a second.

A `move` event is dispatched after every move, containing the corresponding [Move object](#move).

A `gameOver` event is emitted after a move that ends the game. The GameOver object has two keys:
* `reason`: `checkmate`, `stalemate`, `repetition`, `insufficient material` or `fifty-move rule`.
* `result`: 1 for White win, 0 for Black win, or 0.5 for a draw.

A `uci` event is emitted when Stockfish, if enabled, sends a UCI message.

Example listening for `move` and `gameOver` events ([REPL](https://svelte.dev/repl/6fc2874d1a594d76aede4834722e4f83?version=3.59.1)):

```svelte
<script>
  import { Chess } from '@jacksonthall22/svelte-chess'
  import { Board } from '@jacksonthall22/chess.ts'
  
  let board = new Board();

  function moveListener(event) {
    const move = event.detail;
    console.log(`${board.turn} played ${board.san(move)}`);
  }

  function gameOverListener(event) {
    console.log(`The game ended due to ${event.detail.reason}`);
  }
</script>
<Chess bind:board on:move={moveListener} on:gameOver={gameOverListener} />
```

Svelte-chess exports the `MoveEvent`, `GameOverEvent`, `ReadyEvent` and `UciEvent` types.

### Engine / Stockfish

Svelte-chess can be used to play against the chess AI Stockfish 14. You need to download the Stockfish web worker script separately: [stockfish.js web worker (1.6MB)](https://raw.githubusercontent.com/gtim/svelte-chess/stockfish/static/stockfish.js) and serve it at `/stockfish.js`. If you're using SvelteKit, do this by putting it in the static folder.

Example playing Black versus Stockfish ([live](https://gtim.github.io/svelte-chess/stockfish)):

```svelte
<script>
  import Chess, { Engine } from '@jacksonthall22/svelte-chess';
  // Note: stockfish.js must be manually downloaded (see Readme)
</script>
<Chess engine={new Engine({depth: 20, moveTime: 1500, color: 'w'})} />
```

The `engine` prop is an object with the following keys, all optional:

| Key         | Default | Description                                                                 |
| ----------- | ------- | --------------------------------------------------------------------------- |
| `color`     | `b`     | Color the engine plays: `w` or `b`, or `both` for an engine-vs-engine game, or `none` if the engine should only make a move when `makeEngineMove()` is called. | 
| `moveTime`  | 2000    | Max time in milliseconds for the engine to spend on a move.                 |
| `depth`     | 40      | Max depth in ply for the engine to search.                                  |

To inspect Stockfish's current evaluation and other engine details, you can listen to `uci` events from the Chess component to read all [UCI](https://www.chessprogramming.org/UCI) messages sent by Stockfish.

### Styling

The stylesheet shipped with Chessground is used by default. To restyle the 
board, pass the `class` prop and import a stylesheet.

Example with custom stylesheet:

```svelte
<script>
  import { Chess } from '@jacksonthall22/svelte-chess'
</script>
<link rel="stylesheet" href="/my-style.css" />
<Chess class="my-class" />
```

A sample stylesheet can be found in [/static/style-paper.css](https://github.com/gtim/svelte-chess/blob/main/static/style-paper.css).

## Future

* Programmatically draw arrows/circles on the board
