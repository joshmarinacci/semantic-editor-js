
_Note: I’m a research at Nokia but this blog does not represent my employer. 
I didn’t move to Microsoft and I’ve never been on the Windows Phone team.
These ill considered opinions are my own._

Windows 10 seems nice and all, but it doesn’t do anything to make me care.  Fortunately Microsoft can fix all of Windows problems
if only they follow my simple multistep plan. You’re welcome.

#First,  Fix the damn track pads.

The problem: my employer gave me a very nice, probably expensive, laptop. It’s name rhymes with a zinc fad.
It’s specs sure are nice. It’s very fast. but the track pad is horrible.
Every Windows laptop I’ve tried (which is a lot because Jesse likes to ‘do computers’ at Costco) has a horrible
trackpad. why is this so hard? I simply can’t bear to use this laptop without a mouse.
the cursor skips around, gestures don’t work all the time,
and it clicks when i don’t and it doesn’t click when I do.

The fix:  _Take over trackpad drivers_ and make a new quality test for Win10 certification.
It used to be that every mouse and keyboard needed it’s own driver, and they were usually buggy.
I bought Logitech trackballs in the 90s because they seemed to be the only guys who cared
to _actually test_ their drivers (and the addon software was mildly useful).
Sometime in the early USB days (Win98ish?) MS made a default mouse and keyboard driver that all devices had to
work with. Since then it’s never been an issue. Plug in any mouse and it works perfectly.
100% of the time. MS needs to do the same for trackpads.

Please write your own driver for the N most popular chipsets, standardize the gesture support throughout the
OS, then mandate a certain quality level for any laptop that wants to ship windows 10.
Hey OEM: If it’s not a Macbook Air quality trackpad experience then no Windows 10 for you.

# Make  A Proper Command Line Shell

Hide PowerShell, Cygwin, whatever Visual Studio ships with (it has a shell, right?) and the ancient DOS prompt.
Make a proper terminal emulator with Bash. (Fix the bugs first). Build it in to the OS, or at least as a
free developer download (one of those MS Plus thingies you promised us).

This shell should be fully POSIX compliant and run all standard Unix utilities. I understand you might worry
that full POSIX would let developers port code from another platform instead of writing natively for you.
That is very astute thinking… for 1999.  Unfortunately we live in the futuristic hellscape that is 2014.
You need to make it as easy as possible for someone to port code to Windows.
Eliminate all barriers.  Any standard Unix command line program should compile out of the box with
no code changes.  Speaking of which..

# Give your C++ compiler a GCC mode.

For some reason all ANSI C code compiles perfectly on Mac and Linux but requires special #IFDEFs for Windows.h.
Slightly different C libs? Sightly different calling syntax?
None of this __cdecl vs __stdcall nonsense.
Make a `--gcc` flag so that bog standard Linux code compiles with zero changes.
Then submit patches to GNU Autoconf and the other make file builders so that this stuff
just works. Just fix it.

# Build a Package Manager

Now that we have a proper command line Windows needs a package manager. I use Brew on Mac and it works great.
I can install any package, share formulas for new packages, and keep everything up to date. I can grab
older versions of packages if I want. I can switch between them. Everything all works.
Windows *needs* this, and it should work from both a GUI and CLI.

I know Windows has NuGet and Chocolatey and supposedly something is coming called OneGet.
There needs to be one official system that really works. It handles all dependencies. And it
should be easy to use with no surprises.

 _"What surprises?"_ I hear you say?  I wanted to install Node. I couldn’t figure out which package
 manager to use so I chose Chocolatey since it seemed to be all the new hotness. I go
 to their website and find four different packages: Node JS (Install), Node JS, Node JS (Command Line),
 Node Package Manger.  What?  Which do I choose? They all have a lot of downloads.
 On every other platform you just install Node. NPM is built in. There are no separate packages.
 It’s all one thing because you can’t use part of it without the rest.

 NodeJS is an alias for NodeJS.commandline. NodeJS.commandline installs to the Chocolatey lib dir.
NodeJS.install installs to a system dir. It turns out Chocolatey has both installable and
portable packages. As near as I can tell they are identical except for the install path,
which is something I shouldn’t have to care about anyway.  Oh, and one way will add it to your
path and the other won’t.  What? Why should I have to care about the difference? Fix it!

I really hope OneGet straightens all of this nonsense.  There should be just one way to do things
and it must work 100% of the time. I know Microsoft has MSDN subscriptions to sell, but that’s
just another repo source added to the universal package manager.

# Make Visual Studio be everywhere.↵↵Visual Studio is really an impressive piece of software. It’s
really good at what it does. The tooling is amazing. Microsoft needs to let the world know by making
it *be everywhere*.

If you are on Windows, you should get a free copy of VS to download.
In theory this is the idea behind Visual Studio Express.  So why do I still use Atom or
Sublime or even JEdit on Windows?  Partly because of the aforementioned package manager problem,
but also because Visual Studio isn’t good for all kinds of coding.↵↵Visual Studio is primarily a C/C++
editor, meant for MS’s own projects (and now hacked up for WinPhone and presumably WinRT).
They should make it good for everything.

Are you a Java programmer? VS should be your first choice. It should have great Java language support
and even version the JDKs with the aforementioned package manager.

Are you a web developer?  VS
should have awesome HTML and JavaScript support, with the ability to edit remote files via sftp.
(Which Atom still doesn't have, either, BTW).

And all of this should be through open hackable plugins, also managed through the package manager.
VisualStudio should be so good and so fast that it’s the only IDE you need on Windows, no matter what you
are coding.

Why should Microsoft do this?  After all, they would be putting a lot of effort into
supporting developers who don’t code for their platform. Because Microsoft needs developer mindshare.

I know very few topflight developers who use Windows as their main OS.  Most use Macbook Pros or Linux laptops.
MS needs to make a development experience *so good* that programmers will *want* to use Windows,
even if it’s just for web work.

Once I use Windows every day I might take a look at MS’s other stacks.  If I’m already using Visual Studio
for my JavaScript work then I’d be willing to take a look at developing for Windows Phone;
especially if it was a single download within a program I already have installed. Fix it!

# Buy VMWare.

You want me to test new versions of Windows? It should be a single click to download.
You want me to use your cloud infrastructure?  If I could use Visual Studio to create
and manage VM instances, then it’s just a single button to deploy an app from my laptop to the cloud.
MS’s cloud, where they real money from the movie is made.  Buy VM ware to make it happen if you need to.
I don’t care. Just fix it!

# Be open and tell the world.

MS has always had a problem with openness.  They have great technology but have always felt insular.
They build great things for Windows Devs and don’t care about the rest of the world. Contribute
to the larger community.  Make Visual Studio for all sorts of development, even those that don’t add to the
bottom line.

Maybe Visual Studio Express already has all sorts of cool plugins that make web coding awesome.
I will never know because MS doesn’t market to me.  All I hear is “please pretty please make some crappy Windows
Phone apps”.

Maybe OneGet fixes all of the package management problems, but I didn’t even know about it until I
was forced to use a Windows laptop and did my own research.

# Fix It !

Here is the real problem. MS has become closed off. An ecosystem unto itself. This is a great strategy if you are Apple, but you aren’t.
Your a software company become a cloud company.  You must become more open if you expect your
developer mindshare to grow. And from that mindshare new platforms will grow.  When MS releases their Windows
smart watch, or the Windows Toaster, they will find it a lot easier to get developers on board if they’ve
built an open community up first.  Efforts like CodePlex are nice, but this philosophy has to come
from the top.

Good Luck Nadella."

