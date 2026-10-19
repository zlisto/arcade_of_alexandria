import { useCallback, useEffect, useState } from 'react'
import TitleScreen from './screens/TitleScreen'
import IntroCutscene from './screens/IntroCutscene'
import Level01 from './screens/Level01'
import Level02 from './screens/Level02'
import Level03 from './screens/Level03'
import Level04 from './screens/Level04'
import Level05 from './screens/Level05'
import Level06 from './screens/Level06'
import Level0B from './screens/Level0B'
import LevelCastle from './screens/LevelCastle'
import CastleIntro from './movies/CastleIntro'
import CastleOutro from './movies/CastleOutro'
import CylinderMovie from './movies/CylinderMovie'
import HepLesson, { HepLessonOverlay } from './movies/HepLesson'
import TimberMovie from './movies/TimberMovie'
import TimberLesson, { TimberLessonOverlay } from './movies/TimberLesson'
import ConeMovie from './movies/ConeMovie'
import ConeLesson, { ConeLessonOverlay } from './movies/ConeLesson'
import FoundryMovie from './movies/FoundryMovie'
import CellsLesson, { CellsLessonOverlay } from './movies/CellsLesson'
import MirrorMovie from './movies/MirrorMovie'
import MirrorLesson, { MirrorLessonOverlay } from './movies/MirrorLesson'
import LevelMovie from './screens/LevelMovie'
import TidewarpMovie from './movies/TidewarpMovie'
import TidewarpLesson, { LessonOverlay } from './movies/TidewarpLesson'
import Level1_1 from './screens/w1/Level1_1'
import Level1_2 from './screens/w1/Level1_2'
import Level1_3 from './screens/w1/Level1_3'
import Level1_4 from './screens/w1/Level1_4'
import Level1_5 from './screens/w1/Level1_5'
import Level1_6 from './screens/w1/Level1_6'
import Level1_7 from './screens/w1/Level1_7'
import Level1_8 from './screens/w1/Level1_8'
import Level1_9 from './screens/w1/Level1_9'
import Level1_10 from './screens/w1/Level1_10'
import EndpointsMovie from './movies/w1/EndpointsMovie'
import EndpointsLesson, { EndpointsLessonOverlay } from './movies/w1/EndpointsLesson'
import LoopMovie from './movies/w1/LoopMovie'
import LoopLesson, { LoopLessonOverlay } from './movies/w1/LoopLesson'
import WindingRoadMovie from './movies/w1/WindingRoadMovie'
import WindingRoadLesson, { WindingRoadLessonOverlay } from './movies/w1/WindingRoadLesson'
import NoWayOutMovie from './movies/w1/NoWayOutMovie'
import NoWayOutLesson, { NoWayOutLessonOverlay } from './movies/w1/NoWayOutLesson'
import PushForwardMovie from './movies/w1/PushForwardMovie'
import PushForwardLesson, { PushForwardLessonOverlay } from './movies/w1/PushForwardLesson'
import FreeWordMovie from './movies/w1/FreeWordMovie'
import FreeWordLesson, { FreeWordLessonOverlay } from './movies/w1/FreeWordLesson'
import GlueJobMovie from './movies/w1/GlueJobMovie'
import GlueJobLesson, { GlueJobLessonOverlay } from './movies/w1/GlueJobLesson'
import UnderCoverMovie from './movies/w1/UnderCoverMovie'
import UnderCoverLesson, { UnderCoverLessonOverlay } from './movies/w1/UnderCoverLesson'
import SheetMusicMovie from './movies/w1/SheetMusicMovie'
import SheetMusicLesson, { SheetMusicLessonOverlay } from './movies/w1/SheetMusicLesson'
import DeckHallsMovie from './movies/w1/DeckHallsMovie'
import DeckHallsLesson, { DeckHallsLessonOverlay } from './movies/w1/DeckHallsLesson'
import {
  startReefMusic,
  startMusicBox,
  startTimberMusic,
  startConeMusic,
  startForgeMusic,
  startMirrorMusic,
  startNullMusic,
  startTideMusic,
  startBastionMusic,
  startHelixMusic,
  startBasinMusic,
  startPushMusic,
  startFreeWordMusic,
  startGlueWorksMusic,
  startSheetwaterMusic,
  startSheetCanonMusic,
  startDeckRoundMusic,
} from './audio/chip'

/** World 0 · Level 2's intro movie, then the level. */
function Movie02({ concept, onNext }) {
  const lv = concept?.worlds?.[0]?.levels?.find((l) => l.id === '0-2')
  return (
    <LevelMovie
      videoId="level-0-2-intro"
      Scene={TidewarpMovie}
      kicker="World 0 · Level 2"
      name={lv?.title || 'Bend, Don’t Break'}
      startMusic={startTideMusic}
      musicCues={[
        { t: 14.2, start: startNullMusic }, // Count Null appears over his pool
        { t: 21, start: startTideMusic },
      ]}
      onDone={onNext}
      onSkip={onNext}
    />
  )
}

/** 0-2's lesson: the idea of a homotopy and the two new tools, slowed down. */
export function Lesson02({ onNext, embedded }) {
  return (
    <LevelMovie
      videoId="level-0-2-lesson"
      Scene={TidewarpLesson}
      Overlay={LessonOverlay}
      kicker="World 0 · Level 2 · Lesson"
      name="How the Tide Works"
      startMusic={startTideMusic}
      onDone={onNext}
      onSkip={onNext}
      embedded={embedded}
    />
  )
}

/** World 0 · Level 3's intro movie and lesson. */
function Movie03({ concept, onNext }) {
  const lv = concept?.worlds?.[0]?.levels?.find((l) => l.id === '0-3')
  return <LevelMovie videoId="level-0-3-intro" Scene={MirrorMovie} kicker="World 0 · Level 3" name={lv?.title || 'Same Shape, Different Look'} startMusic={startMirrorMusic} onDone={onNext} onSkip={onNext} />
}
function Lesson03({ onNext }) {
  return (
    <LevelMovie
      videoId="level-0-3-lesson"
      Scene={MirrorLesson}
      Overlay={MirrorLessonOverlay}
      kicker="World 0 · Level 3 · Lesson"
      name="Same Shape"
      startMusic={startMirrorMusic}
      onDone={onNext}
      onSkip={onNext}
    />
  )
}

/** World 0 · Level 4's intro movie and lesson. */
function Movie04({ concept, onNext }) {
  const lv = concept?.worlds?.[0]?.levels?.find((l) => l.id === '0-4')
  return <LevelMovie videoId="level-0-4-intro" Scene={FoundryMovie} kicker="World 0 · Level 4" name={lv?.title || 'Some Assembly Required'} startMusic={startForgeMusic} onDone={onNext} onSkip={onNext} />
}
function Lesson04({ onNext }) {
  return (
    <LevelMovie
      videoId="level-0-4-lesson"
      Scene={CellsLesson}
      Overlay={CellsLessonOverlay}
      kicker="World 0 · Level 4 · Lesson"
      name="Built from Cells"
      startMusic={startForgeMusic}
      onDone={onNext}
      onSkip={onNext}
    />
  )
}

/** World 0 · Level 5's intro movie and lesson. */
function Movie05({ concept, onNext }) {
  const lv = concept?.worlds?.[0]?.levels?.find((l) => l.id === '0-5')
  return (
    <LevelMovie
      videoId="level-0-5-intro"
      Scene={ConeMovie}
      kicker="World 0 · Level 5"
      name={lv?.title || 'Cone Zone'}
      startMusic={startConeMusic}
      musicCues={[
        { t: 10.2, start: startNullMusic }, // Count Null admires his plug
        { t: 14.2, start: startConeMusic },
      ]}
      onDone={onNext}
      onSkip={onNext}
    />
  )
}
function Lesson05({ onNext }) {
  return (
    <LevelMovie
      videoId="level-0-5-lesson"
      Scene={ConeLesson}
      Overlay={ConeLessonOverlay}
      kicker="World 0 · Level 5 · Lesson"
      name="New Spaces from Old"
      startMusic={startConeMusic}
      onDone={onNext}
      onSkip={onNext}
    />
  )
}

/** World 0 · Level 6's intro movie and lesson. */
function Movie06({ concept, onNext }) {
  const lv = concept?.worlds?.[0]?.levels?.find((l) => l.id === '0-6')
  return <LevelMovie videoId="level-0-6-intro" Scene={TimberMovie} kicker="World 0 · Level 6" name={lv?.title || 'Timber!'} startMusic={startTimberMusic} onDone={onNext} onSkip={onNext} />
}
function Lesson06({ onNext }) {
  return (
    <LevelMovie
      videoId="level-0-6-lesson"
      Scene={TimberLesson}
      Overlay={TimberLessonOverlay}
      kicker="World 0 · Level 6 · Lesson"
      name="Felling Trees"
      startMusic={startTimberMusic}
      onDone={onNext}
      onSkip={onNext}
    />
  )
}

/** World 0 · Bonus's intro movie and lesson. */
function Movie0B({ onNext }) {
  return <LevelMovie videoId="level-0-b-intro" Scene={CylinderMovie} kicker="World 0 · Bonus" name="Extension Cord" startMusic={startMusicBox} onDone={onNext} onSkip={onNext} />
}
function Lesson0B({ onNext }) {
  return (
    <LevelMovie
      videoId="level-0-b-lesson"
      Scene={HepLesson}
      Overlay={HepLessonOverlay}
      kicker="World 0 · Bonus · Lesson"
      name="One Cell at a Time"
      startMusic={startMusicBox}
      onDone={onNext}
      onSkip={onNext}
    />
  )
}

/** World 0 · Castle's intro movie. */
function MovieCastle0({ onNext }) {
  return <LevelMovie videoId="castle-0-intro" Scene={CastleIntro} kicker="World 0 · Castle" name="The Hollow Throne" startMusic={startNullMusic} onDone={onNext} onSkip={onNext} />
}

/** The castle's outro on its own (the castle plays it embedded; this is for the level select). */
function OutroCastle0({ onNext }) {
  return <LevelMovie videoId="castle-0-outro" Scene={CastleOutro} kicker="World 0 · Castle" name="A Ring Is a Ring" startMusic={startReefMusic} onDone={onNext} onSkip={onNext} />
}

// ---------------------------------------------------------------- World 1 · Bouquet Bastion

/** Intro movie for World 1 · Level K (video `level-1-K-intro`). */
const w1Movie = (k, Scene, fallbackName, startMusic) =>
  function MovieW1({ concept, onNext }) {
    const lv = concept?.worlds?.[1]?.levels?.find((l) => l.id === `1-${k}`)
    return <LevelMovie videoId={`level-1-${k}-intro`} Scene={Scene} kicker={`World 1 · Level ${k}`} name={lv?.title || fallbackName} startMusic={startMusic} onDone={onNext} onSkip={onNext} />
  }
/** Lesson for World 1 · Level K (video `level-1-K-lesson`). */
const w1Lesson = (k, Scene, Overlay, name, startMusic) =>
  function LessonW1({ onNext, embedded }) {
    return <LevelMovie videoId={`level-1-${k}-lesson`} Scene={Scene} Overlay={Overlay} kicker={`World 1 · Level ${k} · Lesson`} name={name} startMusic={startMusic} onDone={onNext} onSkip={onNext} embedded={embedded} />
  }
const Movie1_1 = w1Movie(1, EndpointsMovie, 'Fixed Endpoints', startBastionMusic)
const Lesson1_1 = w1Lesson(1, EndpointsLesson, EndpointsLessonOverlay, 'Fixed Endpoints', startBastionMusic)
const Movie1_2 = w1Movie(2, LoopMovie, 'Loop de Loop', startBastionMusic)
const Lesson1_2 = w1Lesson(2, LoopLesson, LoopLessonOverlay, 'Loops at a Point', startBastionMusic)
const Movie1_3 = w1Movie(3, WindingRoadMovie, 'Winding Road', startHelixMusic)
const Lesson1_3 = w1Lesson(3, WindingRoadLesson, WindingRoadLessonOverlay, 'The Winding Number', startHelixMusic)
const Movie1_4 = w1Movie(4, NoWayOutMovie, 'No Way Out', startBasinMusic)
const Lesson1_4 = w1Lesson(4, NoWayOutLesson, NoWayOutLessonOverlay, 'No Way Out', startBasinMusic)
const Movie1_5 = w1Movie(5, PushForwardMovie, 'Push It Forward', startPushMusic)
const Lesson1_5 = w1Lesson(5, PushForwardLesson, PushForwardLessonOverlay, 'Push It Forward', startPushMusic)
const Movie1_6 = w1Movie(6, FreeWordMovie, 'Free Word Play', startFreeWordMusic)
const Lesson1_6 = w1Lesson(6, FreeWordLesson, FreeWordLessonOverlay, 'Free Words', startFreeWordMusic)
const Movie1_7 = w1Movie(7, GlueJobMovie, 'Glue Job', startGlueWorksMusic)
const Lesson1_7 = w1Lesson(7, GlueJobLesson, GlueJobLessonOverlay, 'Glue and Van Kampen', startGlueWorksMusic)
const Movie1_8 = w1Movie(8, UnderCoverMovie, 'Under Cover', startSheetwaterMusic)
const Lesson1_8 = w1Lesson(8, UnderCoverLesson, UnderCoverLessonOverlay, 'Covers and Lifts', startSheetwaterMusic)
const Movie1_9 = w1Movie(9, SheetMusicMovie, 'Sheet Music', startSheetCanonMusic)
const Lesson1_9 = w1Lesson(9, SheetMusicLesson, SheetMusicLessonOverlay, 'Sheet Music', startSheetCanonMusic)
const Movie1_10 = w1Movie(10, DeckHallsMovie, 'Deck the Halls', startDeckRoundMusic)
const Lesson1_10 = w1Lesson(10, DeckHallsLesson, DeckHallsLessonOverlay, 'Deck Shifts', startDeckRoundMusic)

const SCREENS = {
  title: TitleScreen,
  intro: IntroCutscene,
  level1: Level01,
  movie02: Movie02,
  lesson02: Lesson02,
  level2: Level02,
  movie03: Movie03,
  lesson03: Lesson03,
  level3: Level03,
  movie04: Movie04,
  lesson04: Lesson04,
  level4: Level04,
  movie05: Movie05,
  lesson05: Lesson05,
  level5: Level05,
  movie06: Movie06,
  lesson06: Lesson06,
  level6: Level06,
  movie0b: Movie0B,
  lesson0b: Lesson0B,
  level0b: Level0B,
  moviec0: MovieCastle0,
  castle0: LevelCastle,
  outroc0: OutroCastle0,
  'movie1-1': Movie1_1,
  'lesson1-1': Lesson1_1,
  'level1-1': Level1_1,
  'movie1-2': Movie1_2,
  'lesson1-2': Lesson1_2,
  'level1-2': Level1_2,
  'movie1-3': Movie1_3,
  'lesson1-3': Lesson1_3,
  'level1-3': Level1_3,
  'movie1-4': Movie1_4,
  'lesson1-4': Lesson1_4,
  'level1-4': Level1_4,
  'movie1-5': Movie1_5,
  'lesson1-5': Lesson1_5,
  'level1-5': Level1_5,
  'movie1-6': Movie1_6,
  'lesson1-6': Lesson1_6,
  'level1-6': Level1_6,
  'movie1-7': Movie1_7,
  'lesson1-7': Lesson1_7,
  'level1-7': Level1_7,
  'movie1-8': Movie1_8,
  'lesson1-8': Lesson1_8,
  'level1-8': Level1_8,
  'movie1-9': Movie1_9,
  'lesson1-9': Lesson1_9,
  'level1-9': Level1_9,
  'movie1-10': Movie1_10,
  'lesson1-10': Lesson1_10,
  'level1-10': Level1_10,
}
// World 1: movie → lesson → level, level → next level's movie. (castle1 comes in Phase 3: level1-10 → title until then.)
const W1_CHAIN = Object.fromEntries(
  Array.from({ length: 10 }, (_, i) => i + 1).flatMap((k) => [
    [`movie1-${k}`, `lesson1-${k}`],
    [`lesson1-${k}`, `level1-${k}`],
    ...(k < 10 ? [[`level1-${k}`, `movie1-${k + 1}`]] : []),
  ]),
)
const NEXT = { ...W1_CHAIN, castle0: 'movie1-1', outroc0: 'movie1-1', level1: 'movie02', movie02: 'lesson02', lesson02: 'level2', level2: 'movie03', movie03: 'lesson03', lesson03: 'level3', level3: 'movie04', movie04: 'lesson04', lesson04: 'level4', level4: 'movie05', movie05: 'lesson05', lesson05: 'level5', level5: 'movie06', movie06: 'lesson06', lesson06: 'level6', movie0b: 'lesson0b', lesson0b: 'level0b', level6: 'moviec0', moviec0: 'castle0' }

export default function App() {
  const [screen, setScreen] = useState(
    () => new URLSearchParams(window.location.search).get('screen') || 'title', // dev: ?screen=intro
  )
  const [concept, setConcept] = useState(null)
  const [opts, setOpts] = useState(() => {
    const q = new URLSearchParams(window.location.search)
    return q.get('shrine') ? { startAt: q.get('shrine') } : {} // dev: ?screen=level2&shrine=nulls_snap
  })

  useEffect(() => {
    const url = `${import.meta.env.BASE_URL}data/game_concept.json`
    fetch(url)
      .then((r) => r.json())
      .then(setConcept)
      .catch((err) => {
        console.error(err)
        setConcept({
          story: {
            title: 'Winding World',
            tagline: "Shape can change. Topology can't.",
          },
        })
      })
  }, [])

  const go = useCallback((next, o = {}) => {
    setOpts(o)
    setScreen(next)
  }, [])

  const Screen = SCREENS[screen] || TitleScreen

  return (
    <div className="screen">
      <Screen
        key={`${screen}:${opts.startAt || ''}`}
        {...opts}
        onGo={go}
        concept={concept}
        onNewGame={() => go('intro')}
        onSkipIntro={() => go('level1')}
        onIntroDone={() => go('level1')}
        onBackToTitle={() => go('title')}
        onReplayIntro={() => go('intro')}
        onNext={() => go(NEXT[screen] || 'title')}
      />
    </div>
  )
}
