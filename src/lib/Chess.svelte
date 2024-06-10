<script lang="ts" context="module">
	export type GameOverEvent = CustomEvent<Outcome>;
	export type MoveEvent = CustomEvent<Move>;
	export type UciEvent = CustomEvent<string>;
	export { Engine } from '$lib/engine.js';
</script>
<script lang="ts">
  import { Board, WHITE, type Move, type Outcome, type PieceType, type Square, type Color } from '@jacksonthall22/chess.ts';
	import { Chessground } from '@jacksonthall22/svelte-chessground';
	import PromotionDialog from '$lib/PromotionDialog.svelte';
  import { Api } from '$lib/api.js';
	import type { Engine } from '$lib/engine.js';

	import { onMount, createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher<{ move: Move, gameOver: Outcome, ready: {}, uci: string }>();

	export let chessground: Chessground = undefined!;
	let container: HTMLElement;

	/*
	 * Props
	 */

  // Bindable
  export let board: Board = new Board();
  $: {
    if (api) setBoard(board)
  }
	export let orientation: Color = WHITE;
  export let animationEnabled: boolean = true;

	// Non-bindable
	export let engine: Engine | undefined = undefined;
	let className: string | undefined = undefined;
	export { className as class };

	// API: only accessible through props and methods
	let api: Api | undefined = undefined;

	/*
	 * Methods -- passed to API
	 */

  export function setBoard(newBoard: Board, animate = animationEnabled) {
    if ( ! api ) throw new Error( 'component not mounted yet' );
    api.setBoard(newBoard, animate);
  }
	export function setFen(newFen: string, animate = animationEnabled ) {
		if ( ! api ) throw new Error( 'component not mounted yet' );
		api.setFen(newFen, animate);
	}
	export function pushSan(san: string) {
		if ( ! api ) throw new Error( 'component not mounted yet' );
		api.pushSan(san);
	}
  export function pushUci(uci: string) {
    if ( ! api ) throw new Error( 'component not mounted yet' );
    api.pushUci(uci);
  }
  export function push(move: Move) {
    if ( ! api ) throw new Error( 'component not mounted yet' );
    api.push(move);
  }
  export function getBoard() {
		if ( ! api ) throw new Error( 'component not mounted yet' );
		return api.board;
	}
	export function pop(): Move | null {
		if ( ! api ) throw new Error( 'component not mounted yet' );
		return api.pop();
	}
	export function reset(animate = animationEnabled): void {
		if ( ! api ) throw new Error( 'component not mounted yet' );
		api.reset(animate);
	}
	export function toggleOrientation(): void {
		if ( ! api ) throw new Error( 'component not mounted yet' );
		api.toggleOrientation();
	}
	export async function playEngineMove(): Promise<void> {
		if ( ! api ) throw new Error( 'component not mounted yet' );
		return api.playEngineMove();
	}

	/*
	 * API Construction
	 */

	function stateChangeCallback(api: Api) {
		orientation = api.orientation();
		board = api.board;
	}

	function promotionCallback( square: Square ): Promise<PieceType> {
		return new Promise((resolve) => {
			const element = new PromotionDialog({
				target: container,
				props: { 
					square,
					orientation,
					callback: (piece: PieceType) => {
						element.$destroy();
						resolve( piece );
					}
				},
			});
		});
	}

	function moveCallback( move: Move ) {
		dispatch( 'move', move );
	}
	function gameOverCallback( outcome: Outcome ) {
		dispatch( 'gameOver', outcome );
	}

	onMount( async () => {
		if ( engine ) {
			engine.setUciCallback( (message) => dispatch( 'uci', message ) );
		}
		api = new Api( chessground, board, stateChangeCallback, promotionCallback, moveCallback, gameOverCallback, orientation, engine );
		api.init().then( () => {
			// Dispatch ready-event: Simply letting the parent observe when the component is mounted is not enough due to async onMount.
			dispatch( 'ready' ); 
		} );
	} );
	
</script>

<div style="position:relative;" bind:this={container}>
	<Chessground bind:this={chessground} class={className}/>
</div>

