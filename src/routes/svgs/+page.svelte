<script lang="ts">
	import Chess from '$lib/Chess.svelte';
  import type { Chessground } from '@jacksonthall22/svelte-chessground';

  let chessground: Chessground

  $: if (chessground) {
    chessground.set({
      drawable: {
        brushes: {
          gray2:  {key: 'gray2',  color: '#000', lineWidth: 10, opacity: 0.2},
          gray4:  {key: 'gray4',  color: '#000', lineWidth: 10, opacity: 0.4},
          gray6:  {key: 'gray6',  color: '#000', lineWidth: 10, opacity: 0.6},
          gray8:  {key: 'gray8',  color: '#000', lineWidth: 10, opacity: 0.8},
          gray10: {key: 'gray10', color: '#000', lineWidth: 10, opacity: 1},
        }
      }
    })

    // Note: Shapes set with `setShapes()` can be removed by user interaction,
    //       whereas ones set with `setAutoShapes()` cannot.
    chessground.setAutoShapes([
      {
        orig: 'a2',
        dest: 'a6',
        brush: 'gray2',
        modifiers: {
          hilite: false
        },
      },
      {
        orig: 'b2',
        dest: 'b6',
        brush: 'gray4',
        modifiers: {
          lineWidth: 6,
        },
      },
      {
        orig: 'c2',
        dest: 'c4',
        brush: 'gray6',
      },
      {
        orig: 'd2',
        dest: 'd3',
        brush: 'gray8',
      },
      {
        orig: 'f1',
        dest: 'h3',
        brush: 'gray10',
      },
      {
        orig: 'g1',
        dest: 'f3',
        brush: 'gray4',
      },
    ])
    chessground.redrawAll()
  }
</script>

<div style="max-width:512px;margin:0 auto;">
	<Chess bind:chessground />
</div>


<style>
	div {
		max-width:512px;
		margin:8px auto;
	}
</style>
