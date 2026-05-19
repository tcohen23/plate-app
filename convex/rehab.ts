// AUTO-GENERATED from 06_rehab.json — do not edit manually
// 67 stretches across 17 body-part regions
// Default dosing: 30s × 2 sets. Foam roll: 60-90s × 1.
// Based on ACSM + Wilke et al. 2025 stretching meta-analysis

import { query } from './_generated/server';
import { v } from 'convex/values';

export interface Stretch {
  id: string;
  name: string;
  targets: string;
  how_to: string;
  hold_seconds: number | null; // null = movement-based (use reps, not hold time)
  sets: number;
  each_side: boolean;
  cues: string[];
  stop_signal: string;
}

export interface BodyPart {
  id: string;
  display_name: string;
  order: number;
  description?: string;
  stretches: Stretch[];
}

export const GLOBAL_DISCLAIMER = "If pain is severe or persistent, see a healthcare provider. This is for everyday tightness and soreness, not injury rehab.";

export const REHAB_DATA: BodyPart[] = [
  {
    "id": "neck",
    "display_name": "Neck",
    "order": 1,
    "stretches": [
      {
        "id": "upper_trap_stretch",
        "name": "Upper Trap Stretch",
        "targets": "Upper trapezius, levator scapulae",
        "how_to": "Sit tall. Place right hand on top of head, gently pull head toward right shoulder. Left arm reaches down to anchor the opposite shoulder.",
        "hold_seconds": 30,
        "sets": 2,
        "each_side": true,
        "cues": [
          "Shoulders down \u2014 don't shrug into the stretch",
          "Let the weight of your hand do the work",
          "Breathe into the side of the neck"
        ],
        "stop_signal": "Sharp pain, tingling down the arm"
      },
      {
        "id": "levator_scap_stretch",
        "name": "Levator Scap Stretch",
        "targets": "Levator scapulae",
        "how_to": "Sit tall. Rotate head 45\u00b0 toward your armpit, then look down. Use opposite hand to gently pull head deeper.",
        "hold_seconds": 30,
        "sets": 2,
        "each_side": true,
        "cues": [
          "Nose toward armpit, not down to chest",
          "Chin tucks slightly",
          "Small pulls \u2014 don't yank"
        ],
        "stop_signal": "Dizziness, sharp pain"
      },
      {
        "id": "chin_tuck",
        "name": "Chin Tuck",
        "targets": "Deep neck flexors (counters forward head posture)",
        "how_to": "Sit or stand tall. Pull chin straight back like making a double chin. Hold briefly.",
        "hold_seconds": 5,
        "sets": 10,
        "each_side": false,
        "cues": [
          "Make a double chin, but stay tall",
          "Ears stack over shoulders",
          "No nodding \u2014 straight back"
        ],
        "stop_signal": "Pinching at base of skull"
      },
      {
        "id": "suboccipital_release",
        "name": "Suboccipital Release",
        "targets": "Suboccipital muscles (tension headache zone)",
        "how_to": "Lie on back, two tennis balls in a sock at base of skull. Rest weight onto them.",
        "hold_seconds": 90,
        "sets": 1,
        "each_side": false,
        "cues": [
          "Relax the jaw",
          "Let head sink into the balls",
          "Breathe slowly \u2014 should ease, not intensify"
        ],
        "stop_signal": "Sharp pain or radiating symptoms down the arm"
      }
    ]
  },
  {
    "id": "shoulders",
    "display_name": "Shoulders",
    "order": 2,
    "stretches": [
      {
        "id": "cross_body_shoulder",
        "name": "Cross-Body Shoulder Stretch",
        "targets": "Posterior deltoid, rear shoulder capsule",
        "how_to": "Bring one arm across body at shoulder height. Pull it closer to chest with the other arm.",
        "hold_seconds": 30,
        "sets": 2,
        "each_side": true,
        "cues": [
          "Pull at the elbow, not the wrist",
          "Shoulder stays down, away from ear",
          "Feel it in the back of the shoulder"
        ],
        "stop_signal": "Pinching in front of the shoulder"
      },
      {
        "id": "doorway_pec",
        "name": "Doorway Pec Stretch",
        "targets": "Pec major/minor, anterior delt",
        "how_to": "Stand in doorway, forearm against frame at 90\u00b0. Step forward, rotating torso away.",
        "hold_seconds": 30,
        "sets": 2,
        "each_side": true,
        "cues": [
          "Forearm flat against frame",
          "Rotate the torso, don't lean",
          "Stretch in chest, not shoulder joint"
        ],
        "stop_signal": "Numbness or tingling into hand"
      },
      {
        "id": "sleeper_stretch",
        "name": "Sleeper Stretch",
        "targets": "Posterior shoulder capsule (overhead/bench lifters)",
        "how_to": "Lie on side, bottom arm bent 90\u00b0 at elbow with upper arm flat. Use opposite hand to push forearm toward floor.",
        "hold_seconds": 30,
        "sets": 2,
        "each_side": true,
        "cues": [
          "Don't roll backward \u2014 stay on your side",
          "Small range \u2014 gets intense quickly",
          "Felt in back of shoulder"
        ],
        "stop_signal": "Pinching in front of shoulder = STOP immediately"
      },
      {
        "id": "shoulder_cars",
        "name": "Shoulder CARs (Controlled Articular Rotations)",
        "targets": "Full shoulder joint mobility",
        "how_to": "Stand tall. One arm sweeps slowly forward \u2192 overhead \u2192 behind \u2192 down, drawing biggest circle possible with minimal body movement.",
        "hold_seconds": null,
        "sets": 5,
        "each_side": true,
        "cues": [
          "Go slow \u2014 find the edges of your range",
          "Keep the rest of the body still",
          "Explore \u2014 don't muscle through tight spots"
        ],
        "stop_signal": "Sharp catching pain"
      },
      {
        "id": "banded_shoulder_distraction",
        "name": "Banded Shoulder Distraction",
        "targets": "Shoulder joint capsule (overhead press/pull-up positions)",
        "how_to": "Loop band overhead. Wrist through loop, step away to create tension. Half-kneel, letting band pull arm upward.",
        "hold_seconds": 60,
        "sets": 2,
        "each_side": true,
        "cues": [
          "Let the band do the work \u2014 relax into it",
          "Small movements \u2014 find new positions",
          "No pinching \u2014 back off if you feel it"
        ],
        "stop_signal": "Tingling or front-of-shoulder pain"
      }
    ]
  },
  {
    "id": "upper_back_traps",
    "display_name": "Upper Back / Traps",
    "order": 3,
    "stretches": [
      {
        "id": "thread_the_needle",
        "name": "Thread the Needle",
        "targets": "Mid/upper traps, rhomboids, posterior shoulder",
        "how_to": "On hands and knees. Thread right arm under left arm, lowering right shoulder and ear to floor.",
        "hold_seconds": 30,
        "sets": 2,
        "each_side": true,
        "cues": [
          "Let the shoulder sink \u2014 don't force it",
          "Keep hips square over knees",
          "Breathe into the upper back"
        ],
        "stop_signal": "Neck strain \u2014 keep head supported"
      },
      {
        "id": "kneeling_lat_stretch",
        "name": "Kneeling Lat Stretch (on bench)",
        "targets": "Lats, teres major, upper traps",
        "how_to": "Kneel in front of bench, forearms on it elbows shoulder-width. Drop chest toward floor, hips back.",
        "hold_seconds": 45,
        "sets": 2,
        "each_side": false,
        "cues": [
          "Long from tailbone to crown",
          "Hips push backward",
          "Armpits open toward the floor"
        ],
        "stop_signal": "Shoulder pinching"
      },
      {
        "id": "trap_foam_roll",
        "name": "Trap Foam Roll",
        "targets": "Upper traps, rhomboids",
        "how_to": "Lie on foam roller across upper back. Cross arms over chest. Roll slowly from top of shoulder blades to mid-back.",
        "hold_seconds": 90,
        "sets": 1,
        "each_side": false,
        "cues": [
          "Slow \u2014 pause on spots that need it",
          "Don't roll into the neck",
          "Support head with hands if needed"
        ],
        "stop_signal": "Numbness or tingling"
      }
    ]
  },
  {
    "id": "mid_back_thoracic",
    "display_name": "Mid-Back / Thoracic Spine",
    "order": 4,
    "stretches": [
      {
        "id": "cat_cow",
        "name": "Cat-Cow",
        "targets": "Full spinal mobility",
        "how_to": "Hands and knees. Inhale \u2192 arch back, look slightly up (Cow). Exhale \u2192 round back, tuck chin (Cat).",
        "hold_seconds": null,
        "sets": 15,
        "each_side": false,
        "cues": [
          "Move with the breath",
          "Drive from mid-back, not just lower back",
          "Slow \u2014 feel each segment"
        ],
        "stop_signal": "Lower-back pinching"
      },
      {
        "id": "thoracic_extension_foam_roll",
        "name": "Thoracic Extension Over Foam Roller",
        "targets": "Thoracic spine extension",
        "how_to": "Lie on foam roller placed horizontally under upper back, hands behind head. Slowly lower head and shoulders backward. Move roller 1 inch up/down for different segments.",
        "hold_seconds": 30,
        "sets": 3,
        "each_side": false,
        "cues": [
          "Ribs stay down \u2014 don't let lower back arch",
          "Support head with hands",
          "Small extension \u2014 quality not depth"
        ],
        "stop_signal": "Lower-back pain"
      },
      {
        "id": "open_book",
        "name": "Open Book",
        "targets": "Thoracic rotation",
        "how_to": "Lie on side, knees stacked and bent 90\u00b0, arms extended in front, palms together. Sweep top arm in arc to opposite side. Knees stay stacked.",
        "hold_seconds": null,
        "sets": 8,
        "each_side": true,
        "cues": [
          "Knees stay glued together",
          "Follow your hand with your eyes",
          "Rotate from chest, not hips"
        ],
        "stop_signal": "Pinching in lower back or shoulder"
      },
      {
        "id": "quadruped_tspine_rotation",
        "name": "Quadruped T-Spine Rotation",
        "targets": "Thoracic rotation",
        "how_to": "Hands and knees. Right hand behind head. Rotate right elbow down toward left wrist, then up to ceiling.",
        "hold_seconds": null,
        "sets": 8,
        "each_side": true,
        "cues": [
          "Hips stay square \u2014 don't let them rotate",
          "Follow elbow with eyes",
          "Drive from upper back, not shoulder"
        ],
        "stop_signal": "Lower-back twinge"
      }
    ]
  },
  {
    "id": "lower_back",
    "display_name": "Lower Back",
    "order": 5,
    "stretches": [
      {
        "id": "childs_pose",
        "name": "Child's Pose",
        "targets": "Lower back, lats, hips",
        "how_to": "Kneel with big toes together, knees wide. Sit hips back to heels, reach arms forward, forehead to floor.",
        "hold_seconds": 60,
        "sets": 2,
        "each_side": false,
        "cues": [
          "Sit hips into heels",
          "Long spine \u2014 reach forward through fingertips",
          "Breathe into the lower back"
        ],
        "stop_signal": "Knee pain (place a pillow between hips and heels)"
      },
      {
        "id": "knee_to_chest",
        "name": "Knee-to-Chest",
        "targets": "Lower back, glutes, hip flexors",
        "how_to": "Lie on back. Pull one knee toward chest with both hands. Opposite leg flat or bent on floor.",
        "hold_seconds": 30,
        "sets": 2,
        "each_side": true,
        "cues": [
          "Pull at back of thigh, not the shin",
          "Shoulders relaxed on the floor",
          "Deep, slow breaths"
        ],
        "stop_signal": "Sharp lower-back pain or pain radiating down a leg"
      },
      {
        "id": "supine_spinal_twist",
        "name": "Supine Spinal Twist",
        "targets": "Lower back, glutes, obliques",
        "how_to": "Lie on back. Pull right knee up, guide it across body to the left. Shoulders flat on floor. Look toward right hand.",
        "hold_seconds": 45,
        "sets": 2,
        "each_side": true,
        "cues": [
          "Shoulders pinned to floor \u2014 let hip lift if it has to",
          "Breathe into lower back",
          "No force \u2014 let gravity work"
        ],
        "stop_signal": "Sharp pain (different from a deep stretch)"
      },
      {
        "id": "cobra_press_up",
        "name": "Cobra / Press-Up (McKenzie Extension)",
        "targets": "Lumbar extension (disc-related back pain that's worse with flexion)",
        "how_to": "Lie face-down. Hands flat under shoulders. Press chest up, hips on floor. Pause at top.",
        "hold_seconds": 2,
        "sets": 10,
        "each_side": false,
        "cues": [
          "Hips stay on the floor",
          "Use arms, not back muscles, to press up",
          "Relax the glutes"
        ],
        "stop_signal": "Pain that radiates further down the leg \u2014 stop"
      },
      {
        "id": "glute_bridge_lowback",
        "name": "Glute Bridge (for low-back via glute strengthening)",
        "targets": "Glutes (weak glutes = lower-back compensation)",
        "how_to": "Lie on back, knees bent, feet flat. Drive hips up, squeeze glutes at the top.",
        "hold_seconds": 2,
        "sets": 12,
        "each_side": false,
        "cues": [
          "Squeeze glutes \u2014 not arch the back",
          "Ribs stay down",
          "Drive through heels"
        ],
        "stop_signal": "Lower-back pain (means you're hyperextending instead of using glutes)"
      }
    ]
  },
  {
    "id": "chest",
    "display_name": "Chest",
    "order": 6,
    "stretches": [
      {
        "id": "doorway_pec_chest",
        "name": "Doorway Pec Stretch",
        "targets": "Pec major, pec minor",
        "how_to": "Stand in doorway, forearm against frame at 90\u00b0. Step forward, rotating torso away.",
        "hold_seconds": 30,
        "sets": 2,
        "each_side": true,
        "cues": [
          "Forearm flat against frame",
          "Rotate torso, don't lean",
          "Stretch in chest, not shoulder joint"
        ],
        "stop_signal": "Numbness or tingling into hand"
      },
      {
        "id": "corner_pec_stretch",
        "name": "Corner Pec Stretch",
        "targets": "Both pecs at once",
        "how_to": "Face a corner. Forearms on walls either side, elbows at shoulder height. Lean forward.",
        "hold_seconds": 45,
        "sets": 2,
        "each_side": false,
        "cues": [
          "Forearms flat against walls",
          "Lean from whole body, not just hips",
          "Feel both chest muscles open"
        ],
        "stop_signal": "Shoulder pinching or numbness"
      },
      {
        "id": "lying_pec_foam_roll",
        "name": "Lying Pec Foam Roll",
        "targets": "Pec major",
        "how_to": "Face-down with foam roller or lacrosse ball under one pec just below collarbone. Roll slowly, pausing on tight spots.",
        "hold_seconds": 60,
        "sets": 1,
        "each_side": true,
        "cues": [
          "Stay on the muscle, not the bone",
          "Breathe \u2014 don't tense up",
          "Small movements on tight spots"
        ],
        "stop_signal": "Numbness or pain shooting into arm"
      }
    ]
  },
  {
    "id": "biceps_forearms",
    "display_name": "Biceps / Forearms",
    "order": 7,
    "stretches": [
      {
        "id": "wall_bicep_stretch",
        "name": "Wall Bicep Stretch",
        "targets": "Biceps brachii, anterior shoulder",
        "how_to": "Stand sideways to wall. Reach behind, palm on wall, arm straight at shoulder height. Slowly rotate body away from wall.",
        "hold_seconds": 30,
        "sets": 2,
        "each_side": true,
        "cues": [
          "Arm stays straight \u2014 no bend at elbow",
          "Rotate torso away gradually",
          "Stretch felt down front of arm"
        ],
        "stop_signal": "Numbness or tingling in hand"
      },
      {
        "id": "wrist_flexor_stretch",
        "name": "Wrist Flexor Stretch",
        "targets": "Forearm flexors (palm-side)",
        "how_to": "Extend arm forward, palm up. Use opposite hand to gently pull fingers back toward you.",
        "hold_seconds": 30,
        "sets": 2,
        "each_side": true,
        "cues": [
          "Arm stays straight",
          "Gentle pull \u2014 these muscles are sensitive",
          "Fingers point down for deeper stretch"
        ],
        "stop_signal": "Sharp pain at wrist or elbow"
      },
      {
        "id": "wrist_extensor_stretch",
        "name": "Wrist Extensor Stretch",
        "targets": "Forearm extensors (top of forearm \u2014 common in lifters and desk workers)",
        "how_to": "Extend arm, palm down. Opposite hand gently bends wrist downward, fingers pointing to floor.",
        "hold_seconds": 30,
        "sets": 2,
        "each_side": true,
        "cues": [
          "Arm fully extended",
          "Fingers curl gently into a fist for more depth",
          "Stretch felt on top of forearm"
        ],
        "stop_signal": "Pain near the elbow (possible tennis elbow \u2014 see a professional)"
      }
    ]
  },
  {
    "id": "triceps",
    "display_name": "Triceps",
    "order": 8,
    "stretches": [
      {
        "id": "overhead_tricep_stretch",
        "name": "Overhead Tricep Stretch",
        "targets": "Triceps (especially long head)",
        "how_to": "Reach one arm overhead, bend elbow so hand drops behind head. Use opposite hand to gently press elbow further behind head.",
        "hold_seconds": 30,
        "sets": 2,
        "each_side": true,
        "cues": [
          "Elbow points to ceiling",
          "Ribs down \u2014 don't arch the back",
          "Feel it in back of upper arm"
        ],
        "stop_signal": "Shoulder impingement or pinching"
      },
      {
        "id": "cross_body_tricep",
        "name": "Cross-Body Tricep Stretch",
        "targets": "Triceps (lateral head), rear shoulder",
        "how_to": "Bring one arm across body at shoulder height. Pull it closer to chest with the other arm.",
        "hold_seconds": 30,
        "sets": 2,
        "each_side": true,
        "cues": [
          "Pull at the elbow",
          "Shoulder away from ear",
          "Feel it on outside of arm"
        ],
        "stop_signal": "Pinching in front of shoulder"
      }
    ]
  },
  {
    "id": "core_abs",
    "display_name": "Core / Abs",
    "order": 9,
    "stretches": [
      {
        "id": "cobra_abs",
        "name": "Cobra",
        "targets": "Rectus abdominis, hip flexors",
        "how_to": "Lie face-down. Hands flat under shoulders. Press chest up, hips on floor.",
        "hold_seconds": 30,
        "sets": 2,
        "each_side": false,
        "cues": [
          "Hips stay on the floor",
          "Use arms to press up",
          "Relax glutes"
        ],
        "stop_signal": "Pain that radiates down the leg"
      },
      {
        "id": "standing_side_bend",
        "name": "Standing Side Bend",
        "targets": "Obliques, quadratus lumborum",
        "how_to": "Stand tall, arms overhead. Bend slowly to one side, reaching with top arm.",
        "hold_seconds": 30,
        "sets": 2,
        "each_side": true,
        "cues": [
          "Reach up before reaching over",
          "No twisting \u2014 pure side bend",
          "Ribs stay long"
        ],
        "stop_signal": "Lower-back pinching"
      },
      {
        "id": "banana_reach",
        "name": "Banana Reach",
        "targets": "Full anterior fascia (abs, hip flexors, chest)",
        "how_to": "Lie on back, arms overhead. Reach hands and feet as far apart as possible, body in slight 'banana' curve.",
        "hold_seconds": 30,
        "sets": 2,
        "each_side": false,
        "cues": [
          "Lengthen \u2014 don't tense",
          "Small arch \u2014 comfortable",
          "Feel the whole front body open"
        ],
        "stop_signal": "Lower-back pinching"
      }
    ]
  },
  {
    "id": "hips_hip_flexors",
    "display_name": "Hips / Hip Flexors",
    "order": 10,
    "stretches": [
      {
        "id": "half_kneeling_hip_flexor",
        "name": "Half-Kneeling Hip Flexor Stretch",
        "targets": "Psoas, rectus femoris (sitting tightness)",
        "how_to": "Kneel on right knee, left foot flat in front. Tuck pelvis under (posterior tilt), then drive hips forward.",
        "hold_seconds": 45,
        "sets": 2,
        "each_side": true,
        "cues": [
          "Tuck the pelvis first \u2014 that's where stretch starts",
          "Squeeze the glute on kneeling side",
          "Front shin stays vertical"
        ],
        "stop_signal": "Knee pain (use a pad under the knee)"
      },
      {
        "id": "ninety_ninety",
        "name": "90/90 Stretch",
        "targets": "Hip external and internal rotators, glutes",
        "how_to": "Sit on floor. Front leg bent 90\u00b0 in front, back leg bent 90\u00b0 to the side. Hinge forward over front leg.",
        "hold_seconds": 45,
        "sets": 2,
        "each_side": true,
        "cues": [
          "Sit tall before hinging forward",
          "Front knee/ankle/hip all at 90\u00b0",
          "Drive back knee into floor"
        ],
        "stop_signal": "Knee pain, especially inside front knee"
      },
      {
        "id": "pigeon_pose",
        "name": "Pigeon Pose",
        "targets": "Glutes, hip external rotators, hip flexors (back leg)",
        "how_to": "From plank, bring right knee toward right wrist, shin angled across body. Extend left leg straight back. Lower onto forearms.",
        "hold_seconds": 60,
        "sets": 2,
        "each_side": true,
        "cues": [
          "Hips stay square \u2014 don't sink to one side",
          "Back leg straight and long",
          "Breathe into front glute"
        ],
        "stop_signal": "Knee pain (pillow under working-side hip)"
      },
      {
        "id": "couch_stretch",
        "name": "Couch Stretch",
        "targets": "Rectus femoris, hip flexors (deeper version)",
        "how_to": "Place one shin vertically against wall/couch. Kneel on same-side knee, opposite foot flat in front. Drive hips forward, tuck pelvis.",
        "hold_seconds": 60,
        "sets": 2,
        "each_side": true,
        "cues": [
          "Pelvis tucks under first \u2014 that's the key",
          "Front foot bears weight to control depth",
          "If too much, walk front foot forward"
        ],
        "stop_signal": "Knee pain"
      },
      {
        "id": "frog_stretch",
        "name": "Frog Stretch",
        "targets": "Adductors, hip internal rotators",
        "how_to": "Hands and knees, knees as wide as comfortable, toes pointed out. Sink hips back toward heels.",
        "hold_seconds": 60,
        "sets": 2,
        "each_side": false,
        "cues": [
          "Sink slowly \u2014 rock back and forth at the edge",
          "Shins parallel to each other",
          "Don't force depth"
        ],
        "stop_signal": "Knee or groin pain"
      }
    ]
  },
  {
    "id": "glutes",
    "display_name": "Glutes",
    "order": 11,
    "stretches": [
      {
        "id": "figure_4_supine",
        "name": "Figure-4 Stretch (Supine)",
        "targets": "Glute max, glute medius, piriformis",
        "how_to": "Lie on back, knees bent. Cross right ankle over left thigh. Pull left thigh toward chest.",
        "hold_seconds": 45,
        "sets": 2,
        "each_side": true,
        "cues": [
          "Right knee opens out \u2014 don't force it down",
          "Head/shoulders stay on floor",
          "Breathe into the glute"
        ],
        "stop_signal": "Sharp pain in hip or pain radiating down leg"
      },
      {
        "id": "pigeon_pose_glutes",
        "name": "Pigeon Pose",
        "targets": "Glutes, hip external rotators",
        "how_to": "From plank, right knee toward right wrist, shin angled across body. Left leg straight back. Lower onto forearms.",
        "hold_seconds": 60,
        "sets": 2,
        "each_side": true,
        "cues": [
          "Hips stay square",
          "Back leg straight and long",
          "Breathe into front glute"
        ],
        "stop_signal": "Knee pain"
      },
      {
        "id": "seated_figure_4",
        "name": "Seated Figure-4",
        "targets": "Glutes, piriformis (chair-friendly)",
        "how_to": "Sit in chair. Cross right ankle over left thigh. Hinge forward at hips, back flat.",
        "hold_seconds": 30,
        "sets": 2,
        "each_side": true,
        "cues": [
          "Hinge from hips, not lower back",
          "Right knee drops out naturally",
          "Lean to feel deeper"
        ],
        "stop_signal": "Lower-back pain (means rounding instead of hinging)"
      },
      {
        "id": "glute_foam_roll",
        "name": "Glute Foam Roll",
        "targets": "Glute max, glute medius",
        "how_to": "Sit on foam roller, lean to one side, cross opposite ankle over knee. Roll across glute.",
        "hold_seconds": 90,
        "sets": 1,
        "each_side": true,
        "cues": [
          "Pause on tight spots \u2014 don't keep rolling",
          "Deep breath when uncomfortable",
          "Stay relaxed"
        ],
        "stop_signal": "Sharp pain (vs. dull pressure)"
      }
    ]
  },
  {
    "id": "quads",
    "display_name": "Quads",
    "order": 12,
    "stretches": [
      {
        "id": "standing_quad",
        "name": "Standing Quad Stretch",
        "targets": "Quads (rectus femoris, vastus group)",
        "how_to": "Stand on one leg, hold wall for balance. Grab opposite ankle, pull heel toward glute.",
        "hold_seconds": 30,
        "sets": 2,
        "each_side": true,
        "cues": [
          "Knees stay together \u2014 don't let bent knee drift forward",
          "Tuck pelvis slightly for more stretch",
          "Stand tall"
        ],
        "stop_signal": "Knee pain"
      },
      {
        "id": "side_lying_quad",
        "name": "Side-Lying Quad Stretch",
        "targets": "Quads (more controlled version)",
        "how_to": "Lie on side, bottom leg bent for stability. Grab top-leg ankle, pull heel toward glute. Tuck pelvis.",
        "hold_seconds": 45,
        "sets": 2,
        "each_side": true,
        "cues": [
          "Posterior pelvic tilt first",
          "Knee points straight down \u2014 not forward",
          "Feel it in the quad, not the knee"
        ],
        "stop_signal": "Knee pain"
      },
      {
        "id": "couch_stretch_quads",
        "name": "Couch Stretch",
        "targets": "Rectus femoris (deep)",
        "how_to": "Place one shin vertically against wall/couch. Kneel on same-side knee, opposite foot flat in front. Drive hips forward, tuck pelvis.",
        "hold_seconds": 60,
        "sets": 2,
        "each_side": true,
        "cues": [
          "Pelvis tucks under first",
          "Front foot bears weight to control depth",
          "Walk front foot forward if too much"
        ],
        "stop_signal": "Knee pain"
      },
      {
        "id": "quad_foam_roll",
        "name": "Quad Foam Roll",
        "targets": "Full quad",
        "how_to": "Face-down, foam roller under one thigh. Roll slowly from above knee to hip.",
        "hold_seconds": 90,
        "sets": 1,
        "each_side": true,
        "cues": [
          "Don't roll over knee or hip joints",
          "Slow \u2014 pause on tight spots",
          "Shift leg slightly to find different areas"
        ],
        "stop_signal": "Sharp knee or hip pain"
      }
    ]
  },
  {
    "id": "hamstrings",
    "display_name": "Hamstrings",
    "order": 13,
    "stretches": [
      {
        "id": "standing_hamstring",
        "name": "Standing Hamstring Stretch",
        "targets": "Hamstrings (all three heads)",
        "how_to": "Stand tall. Place one heel on a low surface. Hinge forward at hips, reach toward toes.",
        "hold_seconds": 30,
        "sets": 2,
        "each_side": true,
        "cues": [
          "Hinge from hips, not spine",
          "Back stays flat \u2014 chest leads",
          "Soft bend in standing knee is fine"
        ],
        "stop_signal": "Lower-back pain (means you're rounding)"
      },
      {
        "id": "supine_hamstring_strap",
        "name": "Supine Hamstring Stretch (Strap/Towel)",
        "targets": "Hamstrings (controlled, isolated)",
        "how_to": "Lie on back. Loop towel around ball of one foot. Lift leg toward ceiling, knee mostly straight. Use towel to pull gently closer.",
        "hold_seconds": 45,
        "sets": 2,
        "each_side": true,
        "cues": [
          "Opposite leg stays flat on floor",
          "Soft knee bend is fine \u2014 focus on hip range",
          "Hips stay square"
        ],
        "stop_signal": "Sharp pain behind knee or in lower back"
      },
      {
        "id": "seated_forward_fold",
        "name": "Seated Forward Fold",
        "targets": "Hamstrings, calves, lower back",
        "how_to": "Sit with legs extended in front. Hinge from hips, reach for toes or shins.",
        "hold_seconds": 60,
        "sets": 2,
        "each_side": false,
        "cues": [
          "Reach long \u2014 chest toward thighs, not nose to knees",
          "Sit on a folded towel if tight",
          "Soft knees if needed"
        ],
        "stop_signal": "Lower-back pain"
      }
    ]
  },
  {
    "id": "adductors",
    "display_name": "Adductors / Inner Thigh",
    "order": 14,
    "stretches": [
      {
        "id": "butterfly_stretch",
        "name": "Butterfly Stretch",
        "targets": "Adductors, hip external rotators",
        "how_to": "Sit on floor, soles of feet together, knees out. Hold ankles, gently press knees toward floor.",
        "hold_seconds": 60,
        "sets": 2,
        "each_side": false,
        "cues": [
          "Sit tall, then hinge forward from hips",
          "Don't bounce \u2014 gentle pressure",
          "Feet closer for less intensity, further for more"
        ],
        "stop_signal": "Inside-knee pain"
      },
      {
        "id": "frog_stretch_adductors",
        "name": "Frog Stretch",
        "targets": "Adductors, hip internal rotators",
        "how_to": "Hands and knees, knees wide, toes pointed out. Sink hips back toward heels.",
        "hold_seconds": 60,
        "sets": 2,
        "each_side": false,
        "cues": [
          "Sink slowly \u2014 rock at the edge",
          "Shins parallel",
          "Don't force depth"
        ],
        "stop_signal": "Knee or groin pain"
      },
      {
        "id": "cossack_stretch",
        "name": "Side Lunge / Cossack Stretch",
        "targets": "Adductors (dynamic)",
        "how_to": "Wide stance. Shift weight to one side, bend that knee deeply, opposite leg straight with toes up. Stay tall.",
        "hold_seconds": 30,
        "sets": 2,
        "each_side": true,
        "cues": [
          "Sit hips back as you shift",
          "Heel of bent leg stays down",
          "Straight leg toes point up"
        ],
        "stop_signal": "Inside-knee pain on straight leg"
      }
    ]
  },
  {
    "id": "calves",
    "display_name": "Calves",
    "order": 15,
    "stretches": [
      {
        "id": "wall_calf_gastroc",
        "name": "Wall Calf Stretch (Gastrocnemius)",
        "targets": "Gastrocnemius (straight knee)",
        "how_to": "Face wall, hands on it. Step one foot back, keep straight, heel down. Lean forward.",
        "hold_seconds": 30,
        "sets": 2,
        "each_side": true,
        "cues": [
          "Back leg straight, heel anchored",
          "Front knee bends to lean in",
          "Toes point straight ahead"
        ],
        "stop_signal": "Sharp pain in achilles"
      },
      {
        "id": "wall_calf_soleus",
        "name": "Wall Calf Stretch (Soleus)",
        "targets": "Soleus (bent knee \u2014 deeper calf)",
        "how_to": "Same as gastroc version, but bend the back knee slightly while keeping heel down.",
        "hold_seconds": 30,
        "sets": 2,
        "each_side": true,
        "cues": [
          "Soft bend in back knee \u2014 where soleus lives",
          "Heel pinned to floor",
          "Feel it lower in the calf"
        ],
        "stop_signal": "Achilles pain"
      },
      {
        "id": "downward_dog",
        "name": "Downward Dog",
        "targets": "Calves, hamstrings, shoulders, back",
        "how_to": "From plank, push hips up and back, forming inverted V. Heels press toward floor.",
        "hold_seconds": 45,
        "sets": 2,
        "each_side": false,
        "cues": [
          "Hips up and back \u2014 not shoulders forward",
          "Pedal feet to stretch one calf at a time",
          "Long spine from hands to hips"
        ],
        "stop_signal": "Shoulder pinching"
      },
      {
        "id": "calf_foam_roll",
        "name": "Calf Foam Roll",
        "targets": "Gastrocnemius, soleus",
        "how_to": "Sit with foam roller under one calf. Cross opposite leg over for pressure. Roll slowly from ankle to below knee.",
        "hold_seconds": 90,
        "sets": 1,
        "each_side": true,
        "cues": [
          "Pause on tight spots",
          "Rotate leg to hit inner/outer calf",
          "Don't roll directly behind the knee"
        ],
        "stop_signal": "Sharp pain"
      }
    ]
  },
  {
    "id": "ankles_feet",
    "display_name": "Ankles / Feet",
    "order": 16,
    "stretches": [
      {
        "id": "ankle_dorsiflexion",
        "name": "Ankle Dorsiflexion Stretch",
        "targets": "Ankle mobility (critical for squat depth)",
        "how_to": "Half-kneel, front foot flat a few inches from wall. Drive front knee forward toward wall, heel down.",
        "hold_seconds": 30,
        "sets": 2,
        "each_side": true,
        "cues": [
          "Heel stays glued to the floor",
          "Knee tracks over toe or slightly outside",
          "Small movements \u2014 find your edge"
        ],
        "stop_signal": "Sharp ankle pain"
      },
      {
        "id": "banded_ankle_distraction",
        "name": "Banded Ankle Distraction",
        "targets": "Ankle joint capsule",
        "how_to": "Loop band around front of ankle, anchor low. Step away to create tension pulling ankle backward. Drive knee forward over toes.",
        "hold_seconds": 60,
        "sets": 2,
        "each_side": true,
        "cues": [
          "Let band pull ankle back \u2014 relax into it",
          "Drive knee forward with weight on foot",
          "Small range \u2014 find new positions"
        ],
        "stop_signal": "Sharp pinching"
      },
      {
        "id": "plantar_fascia_roll",
        "name": "Plantar Fascia Roll",
        "targets": "Plantar fascia, foot intrinsic muscles",
        "how_to": "Stand or sit. Tennis or lacrosse ball under one foot. Roll heel to ball of foot.",
        "hold_seconds": 60,
        "sets": 1,
        "each_side": true,
        "cues": [
          "Apply weight gradually \u2014 don't force",
          "Pause on tender spots",
          "Cover the whole arch"
        ],
        "stop_signal": "Acute pain"
      },
      {
        "id": "toe_stretches",
        "name": "Toe Stretches",
        "targets": "Toe extensors and flexors, foot intrinsics",
        "how_to": "Sit, place toes on floor in extended position. Lean weight forward over them. Reverse \u2014 top of foot on floor, press down.",
        "hold_seconds": 30,
        "sets": 2,
        "each_side": true,
        "cues": [
          "Light pressure \u2014 toes are sensitive",
          "Breathe \u2014 don't tense the foot",
          "Stop if anything pinches"
        ],
        "stop_signal": "Sharp pain"
      }
    ]
  },
  {
    "id": "full_body_reset",
    "display_name": "Full Body Reset",
    "order": 17,
    "description": "8\u201310 min flow for general soreness, morning mobility, or post-workout cool-down. Goes through all major regions.",
    "stretches": [
      {
        "id": "fbr_cat_cow",
        "name": "Cat-Cow",
        "targets": "Spinal mobility",
        "how_to": "Hands and knees. Inhale \u2192 arch. Exhale \u2192 round.",
        "hold_seconds": null,
        "sets": 10,
        "each_side": false,
        "cues": [
          "Move with the breath",
          "Slow \u2014 feel each segment"
        ],
        "stop_signal": "Lower-back pinching"
      },
      {
        "id": "fbr_childs_pose",
        "name": "Child's Pose",
        "targets": "Lower back, lats, hips",
        "how_to": "Kneel, big toes together, knees wide. Sit back to heels, reach arms forward.",
        "hold_seconds": 45,
        "sets": 1,
        "each_side": false,
        "cues": [
          "Sit hips into heels",
          "Long spine through fingertips"
        ],
        "stop_signal": "Knee pain"
      },
      {
        "id": "fbr_downward_dog",
        "name": "Downward Dog",
        "targets": "Calves, hamstrings, shoulders",
        "how_to": "From plank, push hips up and back, inverted V.",
        "hold_seconds": 45,
        "sets": 1,
        "each_side": false,
        "cues": [
          "Hips up and back",
          "Pedal feet for calves"
        ],
        "stop_signal": "Shoulder pinching"
      },
      {
        "id": "fbr_hip_flexor",
        "name": "Half-Kneeling Hip Flexor",
        "targets": "Hip flexors",
        "how_to": "Kneel one knee, opposite foot flat in front. Tuck pelvis, drive hips forward.",
        "hold_seconds": 30,
        "sets": 1,
        "each_side": true,
        "cues": [
          "Tuck pelvis first",
          "Squeeze kneeling-side glute"
        ],
        "stop_signal": "Knee pain"
      },
      {
        "id": "fbr_worlds_greatest",
        "name": "World's Greatest Stretch",
        "targets": "Hip flexors, t-spine rotation, hamstrings, adductors",
        "how_to": "Step into deep lunge. Same-side elbow drops inside front foot. Rotate that arm up to ceiling. Then straighten front leg, hinge over for hamstring. Return to lunge, step back.",
        "hold_seconds": null,
        "sets": 5,
        "each_side": true,
        "cues": [
          "Move slowly through each position",
          "Breathe at each stop",
          "Rotate from the upper back"
        ],
        "stop_signal": "Sharp pain anywhere"
      },
      {
        "id": "fbr_figure_4",
        "name": "Figure-4 Stretch",
        "targets": "Glutes, piriformis",
        "how_to": "Lie on back, cross right ankle over left thigh. Pull left thigh toward chest.",
        "hold_seconds": 30,
        "sets": 1,
        "each_side": true,
        "cues": [
          "Knee opens \u2014 don't force",
          "Shoulders relaxed on floor"
        ],
        "stop_signal": "Sharp hip pain"
      },
      {
        "id": "fbr_spinal_twist",
        "name": "Supine Spinal Twist",
        "targets": "Lower back, glutes, obliques",
        "how_to": "Lie on back. Knee crosses to opposite side, shoulders flat.",
        "hold_seconds": 30,
        "sets": 1,
        "each_side": true,
        "cues": [
          "Shoulders pinned to floor",
          "Breathe into the lower back"
        ],
        "stop_signal": "Sharp pain"
      },
      {
        "id": "fbr_banana_reach",
        "name": "Banana Reach",
        "targets": "Anterior fascia (full front body)",
        "how_to": "Lie on back, arms overhead. Reach long, slight banana curve.",
        "hold_seconds": 30,
        "sets": 1,
        "each_side": false,
        "cues": [
          "Lengthen \u2014 don't tense",
          "Feel the whole front body open"
        ],
        "stop_signal": "Lower-back pinching"
      }
    ]
  }
];

// ── Convex queries ──

export const getRehabBodyParts = query({
  args: {},
  returns: v.any(),
  handler: async () => {
    return REHAB_DATA.map(bp => ({
      id: bp.id,
      display_name: bp.display_name,
      order: bp.order,
      stretchCount: bp.stretches.length,
    }));
  },
});

export const getStretchesForBodyPart = query({
  args: { bodyPartId: v.string() },
  returns: v.any(),
  handler: async (_ctx, { bodyPartId }) => {
    const bp = REHAB_DATA.find(b => b.id === bodyPartId);
    if (!bp) return null;
    return { ...bp, disclaimer: GLOBAL_DISCLAIMER };
  },
});

export const getAllRehabData = query({
  args: {},
  returns: v.any(),
  handler: async () => {
    return { body_parts: REHAB_DATA, disclaimer: GLOBAL_DISCLAIMER };
  },
});