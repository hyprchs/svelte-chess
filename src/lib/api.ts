import type { Chessground } from 'svelte-chessground';
import chess from '@jacksonthall22/chess.ts'
import type { Engine } from '$lib/engine.js';


export class Api {
  board: chess.Board;
	private gameIsOver = false;
	private initialised = false;
	constructor(
		private cg: Chessground,
		board: chess.Board,
		private stateChangeCallback: (api: Api) => void = (api)=>{/*noop*/}, // called when the game state (not visuals) changes
		private promotionCallback: (sq: chess.Square) => Promise<chess.PieceType> = async (sq)=>chess.QUEEN, // called before promotion
		private moveCallback: (move: chess.Move) => void = (m)=>{/*noop*/}, // called after move
		private gameOverCallback: (outcome: chess.Outcome) => void = (go)=>{/*noop*/}, // called after game-ending move
		private _orientation: chess.Color = chess.WHITE,
		private engine: Engine | undefined = undefined,
	) {
		this.cg.set( {
			fen: board.fen(),
			orientation: Api._colorToCgColor( _orientation ),
			movable: { free: false },
			premovable: { enabled: false },
		} );
		this.board = board;
	}

	async init() {
		if ( this.engine ) {
			await this.engine.init();
			this.setFen( this.board.fen() );
			if ( this._enginePlaysNextMove() ) {
				this.playEngineMove();
			}
		} else {
			this.setFen( this.board.fen() );
		}
		this.initialised = true;
	}

  setBoard( board: chess.Board, animate = true ) {
    let engineStopSearchPromise;
    if (this.initialised && this.engine?.isSearching() )
      engineStopSearchPromise = this.engine.stopSearch();
    this.board = board;
    this._checkForGameOver();
    this.cg.set({ animation: { enabled: animate } });
    const cgColor = Api._colorToCgColor(this.board.turn);
    const enginePlaysNextMove = this._enginePlaysNextMove();
    this.cg.set({
      fen: board.fen(),
      turnColor: cgColor,
      check: this.board.isCheck(),
      lastMove: undefined,
      selected: undefined,
      movable: {
        free: false,
        color: cgColor,
        dests: enginePlaysNextMove ? new Map() : this.possibleMovesDests(),
        events: {
          after: (orig: string, dest: string) => {
            this._chessgroundMoveCallback(orig, dest);
          },
        },
      },
    });

    if (this.initialised && enginePlaysNextMove) {
      // Play immediate engine move, but wait until stopSearch has finished
      if (engineStopSearchPromise) {
        engineStopSearchPromise.then(() => {
          this.playEngineMove();
        });
      } else {
        this.playEngineMove();
      }
    }
    this.stateChangeCallback(this);
  }

	// Load FEN. Throws exception on invalid FEN.
	setFen( fen: string, animate = true ) {
    this.setBoard(new chess.Board(fen), animate);
	}

	/*
	 * Making a move
	 */

	// called after a move is played on Chessground
	async _chessgroundMoveCallback(
      orig: string,
      dest: string
    ) {
		if ( orig === 'a0' || dest === 'a0' ) {
			// the Chessground square type (Key) includes a0
			throw Error('invalid square');
		}

    const fromSquare = chess.parseSquare(orig)
    const toSquare = chess.parseSquare(dest)
    
		if ( this.engine && this.engine.isSearching() )
			this.engine.stopSearch();
		
    const move = new chess.Move(fromSquare, toSquare)
    if (this._moveIsPromotion(move)) {
      move.promotion = await this.promotionCallback(toSquare);
    }
    this.board.push(move)

    this._postMoveAdmin( move );
	}

	private _moveIsPromotion( move: chess.Move ): boolean {
		return !!(chess.BB_SQUARES[move.toSquare] & chess.BB_BACKRANKS) && this.board.pieceTypeAt(move.fromSquare) === chess.PAWN;
	}

	// Make a move programmatically
	// argument is either a short algebraic notation (SAN) string
	// or an object with from/to/promotion (see chess.js move())
	push( move: chess.Move ) {
		if ( ! this.initialised )
			throw new Error('Called move before initialisation finished.');
		if ( this.gameIsOver )
			throw new Error('Invalid move: Game is over.');
		if ( this.engine && this.engine.isSearching() )
			this.engine.stopSearch();
		this.board.push( move ); // throws on illegal move
		this.cg.move(chess.squareName(move.fromSquare), chess.squareName(move.toSquare));
    this.cg.set({ turnColor: Api._colorToCgColor( this.board.turn ) });
		this._postMoveAdmin( move );
	}
	// Make a move programmatically from a UCI notation (LAN) string,
	// as returned by UCI engines.
	pushUci( uci: string ) {
		const move = chess.Move.fromUci(uci);
		this.push(move);
	}

  pushSan( san: string ) {
    const move = this.board.parseSan(san)
    this.push(move)
  }

	// Called after a move (chess.js or chessground) to:
	// - update chess-logic details Chessground doesn't handle
	// - dispatch events
	// - play engine move 
	private _postMoveAdmin( move: chess.Move ) {
		const enginePlaysNextMove = this._enginePlaysNextMove();

		// reload FEN after en-passant or promotion. TODO make promotion smoother
		if ( this.board.isEnPassant(move) || move.promotion !== null ) {
			this.cg.set({ fen: this.board.fen() });
		}
		// highlight king if in check
		if ( this.board.isCheck() ) {
			this.cg.set({ check: true });
		}
		// dispatch move event
		this.moveCallback( move );
		// dispatch gameOver event if applicable
		this._checkForGameOver();
		// set legal moves
		if ( enginePlaysNextMove ) {
			this.cg.set({ movable: { dests: new Map() } }); // no legal moves
		} else {
			this._updateChessgroundWithPossibleMoves();
		}
		// update state props
		this.stateChangeCallback(this);
		
		// engine move
		if ( ! this.gameIsOver && enginePlaysNextMove ) {
			this.playEngineMove();
		}
	}

	async playEngineMove() {
		if ( ! this.engine )
			throw new Error('playEngineMove called without initialised engine');
		return this.engine.getMove( this.board.fen() ).then( (uci) => {
			this.pushUci(uci);
		});
	}

	private _enginePlaysNextMove() {
		return this.engine && ( this.engine.getColor() === 'both' || this.engine.getColor() === this.board.turn );
	}

	private _updateChessgroundWithPossibleMoves() {
		const cgColor = Api._colorToCgColor( this.board.turn );
		this.cg.set({
      turnColor: cgColor,
      movable: {
        color: cgColor,
        dests: this.possibleMovesDests(),
      },
    });
	}
	private _checkForGameOver() {
    this.gameIsOver = this.board.isGameOver()
    
    if ( this.gameIsOver ) {
      this.gameOverCallback( this.board.outcome() as chess.Outcome )
    }
	}


	// Find all legal moves in chessground "dests" format
	possibleMovesDests() {
		const dests = new Map<string, string[]>();
		if ( ! this.gameIsOver ) {
			chess.SQUARES.forEach(s => {
				const moves = Array.from(this.board.generateLegalMoves(chess.BB_SQUARES[s]));
				if (moves.length) dests.set(chess.squareName(s), moves.map(m => chess.squareName(m.toSquare)));
			});
		}
		return dests;
	}

	// Reset board to the starting position
	reset(animate = true): void {
		this.setFen(chess.STARTING_FEN, animate);
	}

	// Undo last move
	pop(): chess.Move | null {
		const move = this.board.pop();
		const turnColor = Api._colorToCgColor( this.board.turn );
		this.cg.set({
			fen: this.board.fen(),
			check: this.board.isCheck() ? turnColor : undefined,
			turnColor: turnColor,
			lastMove: undefined,
		});
		this.gameIsOver = this.board.isGameOver();  // Don't set to false blindly - FEN could be mate, but no move stack
		this._updateChessgroundWithPossibleMoves();
		this.stateChangeCallback(this);
		return move;
	}

	// Board orientation
	toggleOrientation(): void {
		this._orientation = this._orientation === chess.WHITE ? chess.BLACK : chess.WHITE;
		this.cg.set({
			orientation: Api._colorToCgColor( this._orientation ),
		});
		this.stateChangeCallback(this);
	}
	orientation(): chess.Color {
		return this._orientation;
	}

	// Convert between chess.ts color (true/false) and chessground color ('white' / 'black').
	// Chess.js color is always used internally.
	static _colorToCgColor( chessjsColor: chess.Color ): 'white' | 'black' {
		return chessjsColor === chess.WHITE ? 'white' : 'black';
	}
	static _cgColorToColor( chessgroundColor: 'white' | 'black' ): chess.Color {
		return chessgroundColor === 'white' ? chess.WHITE : chess.BLACK;
	}

}
