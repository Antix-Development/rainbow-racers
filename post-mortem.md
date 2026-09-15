# A FEW WORDS ON JS13K 2026.

Well another year down, another js13k completed, with the theme for this year (2026) being "Rainbows and Unicorns".

My first idea was to create an arena shooting game and after a few days that wasn't working as I imagined, so out it went.

![Arena Shooter Prorotype](/js13k-stuff/proto1.png)

Next I thought a 1st person shooter would be cool and I had a bunch of code from a failed 2025 prototype so I tried that. The prototype advanced a lot but after a few days it also wasn't feeling right, so I ditched it.

I did spend a lot of time on this prototype, creating a level editor and a full 3d box modeller, both of which are a little janky to use but can produce some really cool content.

![1st Person Shooter Prorotype](/js13k-stuff/proto2.png)

I then thought that some form of racing game would be neat, and I made quite a lot of progress and was happy with the overall direction, but couldn't see how the theme could be easily applied, so I gave up on it.

![A2D Racer Prorotype](/js13k-stuff/proto3.png)

#### THE GAME

Then I wondered ... what if the track was a rainbow and in the rainbow was in the sky? I had the unicorn 3d model I made for the 1st person shooter, so what if it was also 3d? By this time a week or more had passed and I needed to get to work, and so I did.

I'm shit at 3d stuff so I got some of my AI pals to lend a hand with that side of things and after some effort we got the basic track generating.

The world was quite empty but I had a track and the unicorn model which could drive around it.

I added a bunch of random boxes on he inside of the track. Initially these were randomly placedand randomly sized but there were way too many of them and trhey looked pretty bad.

I ended up making them like another inner track and not so randomly sized, just random heights. This works pretty well and it does look like you're racing around a bunch of cliffs.

Snce the whole racing scenario takes place in the sky it would be prudent (I thought) to have some clouds, and since I was (am) enthralled by boxes, they ended up being places around the outer perimeter of the track as a collection of boxes.

I'm mostly happy with how they turned out, but they do sometimes have boxes where faces are on the same plane coordinates and there's a little graphical glitchiness, but they still work.

At this point I had a basic prototype but no user interface.

After a lot of agonizing and a lot ofwork I ended up using a basic 2d canvas overlay for the UI. I toyed with using a custom font but that just gobbled up way too many bytes and I settled on the systems ui font which actually doesn't look too bad when it's fattened up, outlined, and randomly rotated. The basic sky background and clouds (I feel) made quite a nice background for the menus.

After implementing the ui I began working on the non player unicorns and after (yet again) much deliberation and effort I had them working.

They randomly pick a lane and kind of drive on that lane, moving back to it when they overtake, use a booster pad, or being bunted. I had oroginally made them like F1 cars and follow the best raciong line but then they looked kind of shit, like a unicorn congo line or convoy, and that isn't what I wanted.

I got Gemini to help me make the engine noise and I am kind of happy with how it turned out. It pans and is fully 3D and sounds pretty great through headphones.

I put a lot of effort into trying to make music this year but everything failed and I quite liked just the buzzing of the engines, so I ended up using ZZFXM Studio and clicking buttons until it generated two random tunes that I didn't mind too much.

The race logic was relatively easy compared to most of the other features in the game and I'm happy with how the two game modes ended up.

### THE SECOND GAME

I decided to revisit the arena shooter game but after a wee while I started to hit the limits of what could be achieved with canvas rendering, so I transitioned to WebGL rendering and that made a huge difference.

I added a flashy background, snazzy looking bitmap graphics, and rainbow'ed it up a lot.

I was happy with the direction it was heading but sadly for this year I ran out of time so it was never completed.

![2D Rainbow Shooter Prorotype](/js13k-stuff/proto4.png)

### WHAT WORKED

#### AI.

It can be terribly good, and it allows people to leverage technologies that they have little or no knowledge about.

A lot of time was spent Getting a feature sort of working using the agent and then modifying it so it actually worked how I wanted it to.

### WHAT DID NOT WORK

#### AI. 

Once ones code gets to a certain arbitrary size, hallucination becomes exponentially worse.

The only way to combat this is to have stripped down versions of code so it isn't too big that the agent will not go full on wonkey donkey.

#### AUDIO

ZZFX is a really awesome sound effect system, but for me personally its always been a bit of a "click until you randomly generate something kind of what you think you want" affair.

I'll continue to use it but will be looking at other systems for next year too.

ZZFXM is also a neat program but sadly its not terribly good to use, though I do lack musical skills.

This year I also began wrting my own music tracker based on ZZFXM and using ZZFX for instrument generation, but abandonned it once I had it in a working state because I have no musical talent, and I didn't think the game suited music.

### ON AI

AI is a double edged sword. I like and dislike it at the same time.

It is a great enabler, but its (in the context of js13k) a great pain in the rectum because there is a growing number of "AI slop" games where the participant has actually used AI to create something, but it is slop and they have not refined it in any valid (IMHO) manner. So this year there is a record number of "slop entries" and I will be scoring those as such.

I feel also that some people have a great advantage when it comes to these tools because either throuh their own immense wealth, or through their employment, they can access the best models which just perform better (less hallucination with large code) than anything you can get for free.

I guess that there will always be "haves" and "have nots", but it still doesn't sit quite right with me.

### FINAL THOUGHTS

This year was enjoyable, even though initially I was not keen on the theme.

I'm already looking forwards to next year and have many failed prototypes from this year (and tons from previous years) which may be of use, if they can be made to work with the theme.

I'm especially excited about the 1st person shooter prototype because even though it doesn't look like much, it has most of that game genre implemented, and in around only 7K zipped!

See you all next year, Antix out!
