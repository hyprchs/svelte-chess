<script lang="ts">
	import Chess, { Engine } from '$lib/Chess.svelte';
  import { Board, WHITE, BLACK } from "@jacksonthall22/chess.ts"
	let chess: Chess;

  let board = new Board()
</script>

<div style="max-width:512px;margin:0 auto;">
	<Chess
		bind:this={chess}
    bind:board
		orientation={BLACK}
		engine={new Engine({depth: 20, moveTime: 1500, color: WHITE})}
	/>
	<button on:click={()=>chess?.reset()}>Reset board</button>
	<button on:click={()=>chess?.undo()}>Undo</button>
	<button on:click={()=>chess?.playEngineMove()}>Play engine move</button>
</div>

<style>
	button {
		margin-top:16px;
	}
</style>
