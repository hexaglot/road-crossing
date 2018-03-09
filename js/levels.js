const level_data = [{
    bg: `wgggw
         ggggg
         ggggg
         sssss
         ggggg
         ggggg`,
    fg: `--x--
         -----
         -----
         -----
         -----
         --p--`,
    enemies: [{ row: 3, speed: 1, pattern: [2] }]
},
{
    bg: `wgggw
         ggggg
         sssss
         ggggg
         sssss
         ggggg`,
    fg: `--x--
         r----
         -----
         -----
         -----
         --p--`,
    enemies: [{ row: 2, speed: 1, pattern: [2] }, { row: 4, speed: -1, pattern: [2] }]
},
{
    bg: `wgggw
         ggggg
         sssss
         ggggg
         sssss
         ggggg`,
    fg: `--x--
         ---r-
         -----
         -r---
         -----
         --p--`,
    enemies: [{ row: 2, speed: 1, pattern: [2, 1, 1, 2, 1] }, { row: 4, speed: -1.2, pattern: [2] }]
},
{
    bg: `wwgww
         sssss
         ggggg
         sssss
         ggggg
         wwgww`,
    fg: `--x--
         -----
         -----
         -----
         -----
         --p--`,
    enemies: [{ row: 1, speed: -1, pattern: [0.5, 1.2, 1.3, 1.1, 1.2] }, { row: 3, speed: 1.2, pattern: [1.5, 1] }]
},
{
    bg: `wwggg
         ggggg
         sssss
         sssss
         ggggg
         ggggg`,
    fg: `---rx
         -----
         -----
         -----
         --r--
         --p--`,
    enemies: [
        { row: 2, speed: 1, pattern: [1] },
        { row: 3, speed: 1, pattern: [2] }]
},


{
    bg: `wwggg
         sssss
         sssss
         ggggg
         sssss
         ggggg`,
    fg: `----x
         -----
         -----
         --r--
         -----
         p--rr`,
    enemies: [
        { row: 1, speed: -1, pattern: [1,1.2] },
        { row: 2, speed: 1, pattern: [2,1.5] },
        { row: 4, speed: -1.5, pattern: [1.5,1.5,1.2] }]
},




];