// The last world that is open in this build. Roads to later worlds stay blocked by rockfall, and their level-select
// groups and shard warps stay hidden, until each world has been through its critics. Raise it as worlds ship.
export const OPEN_UP_TO = 10
/** may the road into world n open, once the shard before it is held? */
export const roadOpen = (n, shards) => (n <= OPEN_UP_TO || import.meta.env.DEV) && (shards || 0) >= n - 1
