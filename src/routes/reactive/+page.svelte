<script lang="ts">
	import Chess from '$lib/Chess.svelte';
  import { Board, COLOR_NAMES, colorIdx } from "@jacksonthall22/chess.ts"
	let board: Board = new Board();

  let sanHistory: string[] = []
  $: {
    board = board
    const tempBoard = new Board()
    sanHistory = board.moveStack.map(move => tempBoard.sanAndPush(move))
  }
</script>

<div style="max-width:512px;margin:0 auto;">
	<Chess bind:board />
</div>

{#if board.isCheck()}
	<p>Check!</p>
{/if}
<p>Move {board.fullmoveNumber}, {COLOR_NAMES[colorIdx(board.turn)]} to move.</p>
{#if sanHistory.length > 0}
	<p>Moves: {sanHistory.join(' ')}</p>
{/if}
<p style="white-space:nowrap;">FEN: {board.fen()}</p>

<style>
	div, p {
		max-width:512px;
		margin:8px auto;
	}
</style>
