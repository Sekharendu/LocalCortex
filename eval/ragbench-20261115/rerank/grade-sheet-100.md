# Grading sheet: 100 ordinary-PDF dev questions, blend top 10 vs top 15 (§28)

Grade each answer: **C** correct, **P** partly correct, **W** wrong, **R** said insufficient / refused.
Answer chunks = the chunks labelled as holding the answer (same labels as the search tests). Chunk text is as stored (raw PDF text, tables flattened). Claude's own grades are in `neurons-grades.json`, left out here so they don't bias you.

---

## 1. `tat-0736` (tat, nielsen-nv_2019)

**Question:** What is the difference between the total payment for operating leases and finance lease obligations?

**Reference answer:** 412

**Answer chunks:** 2 labelled:

<details><summary>chunk #823 (search rank 1)</summary>

```text
(in millions)
Operating
Leases
Finance
Leases
2020 $ 136 $ 61
2021 99 42
2022 75 29
2023 53 15
2024 40 7
Thereafter 171 8
Total lease payments 574 162
Less imputed interest (94) (17)
Total $ 480 $ 145
82
```

</details>

<details><summary>chunk #641 (search rank 3)</summary>

```text
Payments due by period
(IN MILLIONS) Total 2020 2021 2022 2023 2024 Thereafter
Finance lease obligations(a) $ 162 $ 61 $ 42 $ 29 $ 15 $ 7 $ 8
Operating leases(b) 574 136 99 75 53 40 171
Other contractual obligations(c) 1,639 627 295 203 190 185 139
Long-term debt, including current portion(a) 8,164 854 702 2,399 3,710 — 499
Interest(d) 1,038 354 315 216 115 25 13
Pension fund obligations(e) 28 28 — — — — —
Total $ 11,605 $ 2,060 $ 1,453 $ 2,922 $ 4,083 $ 257 $ 830
```

</details>

**Model answer, top 10:**

> The total payment for operating leases is $574 million and the total payment for finance lease obligations is $162 million. The difference between the total payment for operating leases and finance lease obligations is $412 million.

Your grade (top 10): ____c

**Model answer, top 15:**

> The total payment for operating leases is $574 million and the total payment for finance lease obligations is $162 million. The difference between the total payment for operating leases and finance lease obligations is $412 million.

Your grade (top 15): ____

---

## 2. `tat-0785` (tat, tencent_2019)

**Question:** How many percent of the total shares granted as at 1 January was the 21 March 2016 grant?

**Reference answer:** 21.78

**Answer chunks:** 1 labelled:

<details><summary>chunk #149 (not in search top 20)</summary>

```text
24 March 2021 (Note 1)
21 March 2016 3,750,000 – – 3,750,000 158.10 21 March 2017 to
20 March 2023 (Note 2)
24 March 2017 5,250,000 – – 5,250,000 225.44 24 March 2018 to
23 March 2024 (Note 2)
9 April 2018 3,215,800 – – 3,215,800 410.00 9 April 2019 to
8 April 2025 (Note 2)
4 April 2019 – 3,506,580 – 3,506,580 376.00 4 April 2020 to
(Note 3) 3 April 2026 (Note 2)
Total: 17,215,800 3,506,580 – 20,722,380
Note:
```

</details>

**Model answer, top 10:**

> The context does not provide the total number of shares granted as at 1 January, so it is not possible to determine the percentage of the total shares represented by the 21 March 2016 grant.

Your grade (top 10): ____Check why it did not agot the correct chubk and diagonise it

**Model answer, top 15:**

> The provided context is insufficient to answer this question.

Your grade (top 15): ____

---

## 3. `nq-0379` (nq, William Fichtner)

**Question:** who plays the fbi agent in prison break

**Reference answer:** William Edward Fichtner Jr. (

**Answer chunks:** 2 labelled:

<details><summary>chunk #1 (search rank 3)</summary>

```text
American actor. He has appeared in a number of notable films and TV
series. He is known for his roles as Sheriff Tom Underlay in the
television series Invasion, Alexander Mahone on Prison Break, and
numerous film roles, including: Quiz Show, Heat, blind astronomer Kent
in Contact, Armageddon, The Perfect Storm, Crash, Blades of Glory,
Black Hawk Down, Nine Lives, The Longest Yard, Mr. & Mrs. Smith,
The Dark Knight, Date Night, The Lone Ranger, Phantom, Elysium,
```

</details>

<details><summary>chunk #2 (not in search top 20)</summary>

```text
Independence Day: Resurgence, and Teenage Mutant Ninja Turtles.
Fichtner was born on Mitchel Air Force Base[2] on Long Island, and was
raised in Cheektowaga, New York, a suburb of Buffalo. He is the son of
Patricia A. (née Steitz) and William E. Fichtner.[3][4] He has German
ancestry.[5]
Fichtner graduated from Maryvale High School (Cheektowaga) in 1974.
After graduating from Farmingdale State College in 1976 with an
associate degree in criminal justice, he attended SUNY Brockport and
```

</details>

**Model answer, top 10:**

> William Fichtner plays the FBI Agent Alexander Mahone in Prison Break.

Your grade (top 10): ____pc(but  wasn't the full name in tthe respinse)

**Model answer, top 15:**

> William Fichtner plays the FBI agent Alexander Mahone in Prison Break.

Your grade (top 15): ____

---

## 4. `nq-0279` (nq, List of UFC champions)

**Question:** first champion of the women's division of the ufc

**Reference answer:** Dec 6, 2012

**Answer chunks:** 4 labelled:

<details><summary>chunk #52 (search rank 3)</summary>

```text
(incumbent)
126 to 135 lb (57 to 61 kg) Prior to its folding and absorption by the UFC, Ronda Rousey was the Strikeforce Women's Bantamweight Champion. Rousey was
awarded the inaugural UFC Women's Bantamweight Championship on December 6, 2012, at a UFC on Fox: Henderson vs. Diaz pre-event press conference.[34]
No. Name Event Date Reign Defenses
1 Ronda Rousey
promoted to undisputed champion
UFC on Fox: Henderson vs. Diaz
press conference
Seattle, WA, USA
Dec 6, 2012 1,074 days
```

</details>

<details><summary>chunk #54 (search rank 4)</summary>

```text
4 Amanda Nunes UFC 200
Las Vegas, NV, USA Jul 9, 2016 2830 days
(incumbent)
1. def. Ronda Rousey at UFC 207 on Dec 30, 2016
2. def. Valentina Shevchenko at UFC 215 on Sep 9, 2017
106 to 115 lb (48 to 52 kg) Previously the Invicta FC strawweight champion, Carla Esparza defeated Rose Namajunas for the inaugural title on December 12,
2014 in the tournament finale for The Ultimate Fighter: A Champion Will Be Crowned.[11]
Women's championship history
Women's Featherweight Championship
```

</details>

<details><summary>chunk #53 (search rank 20)</summary>

```text
Seattle, WA, USA
Dec 6, 2012 1,074 days
1. def. Liz Carmouche at UFC 157 on Feb 23, 2013
2. def. Miesha Tate at UFC 168 on Dec 28, 2013
3. def. Sara McMann at UFC 170 on Feb 22, 2014
4. def. Alexis Davis at UFC 175 on Jul 5, 2014
5. def. Cat Zingano at UFC 184 on Feb 28, 2015
6. def. Bethe Correia at UFC 190 on Aug 1, 2015
2 Holly Holm UFC 193
Melbourne, Australia
Nov 15,
2015 111 days
3 Miesha Tate UFC 196
Las Vegas, NV, USA Mar 5, 2016 126 days
4 Amanda Nunes UFC 200
```

</details>

<details><summary>chunk #44 (not in search top 20)</summary>

```text
- Conor McGregor
def. Chad Mendes for interim title
UFC 189
Las Vegas, NV, USA Jul 11, 2015 —
2 Conor McGregor UFC 194
Las Vegas, NV, USA
Dec 12,
2015 350 days
- José Aldo
def. Frankie Edgar for interim title
UFC 200
Las Vegas, NV, USA Jul 9, 2016 —
McGregor was stripped of the title on November 26, 2016 after failing to defend.[27][28]
3 José Aldo (2)
promoted to undisputed champion — Nov 26,
2016
189 days
(2,037 days)
- Max Holloway
def. Anthony Pettis for interim title
UFC 206
```

</details>

**Model answer, top 10:**

> The first champion of the women's division of the UFC was Ronda Rousey. She was awarded the inaugural UFC Women's Bantamweight Championship on December 6, 2012, at a UFC on Fox: Henderson vs. Diaz pre-event press conference.

Your grade (top 10): ____c(the reference ans is worong, while the model accurately asnwers it)

**Model answer, top 15:**

> The first champion of the women's division of the UFC was Ronda Rousey. She was awarded the inaugural UFC Women's Bantamweight Championship on December 6, 2012.

Your grade (top 15): ____

---

## 5. `feta-0420` (feta, Des Moines, Iowa)

**Question:** Which teams play in the Wells Fargo Arena?

**Reference answer:** Wells Fargo Arena of the Iowa Events is home to the Iowa Barnstormers of the Indoor Football League, the Iowa Wild of the American Hockey League, and the Iowa Wolves of the NBA G League.

**Answer chunks:** 3 labelled:

<details><summary>chunk #122 (search rank 3)</summary>

```text
Kruidenier Trail bridge
across Gray's Lake
Wells Fargo Arena of the Iowa Events Center is home to the Iowa Barnstormers of the Indoor Football League, the Iowa Wild
of the American Hockey League, and the Iowa Wolves of the NBA G League. The Barnstormers relaunched as an af2 club in
2008 before joining a relaunched Arena Football League in 2010 and the Indoor Football League in 2015; the Barnstormers
```

</details>

<details><summary>chunk #126 (search rank 4)</summary>

```text
Des Moines Menace USL League Two Drake Stadium 1994
Iowa Wolves NBA G League Wells Fargo Arena 2007
Iowa Barnstormers Indoor Football League Wells Fargo Arena 1995 (2008)
Iowa Wild American Hockey League Wells Fargo Arena 2013
Des Moines has 76 city parks and three golf courses, as well as three family aquatic centers, five
community centers and three swimming pools. The city has 45 miles (72 km) of trails. The first
```

</details>

<details><summary>chunk #70 (search rank 9)</summary>

```text
national bands. It is the home of the Iowa Wolves of the NBA G League, the Iowa Wild
of the American Hockey League, and the Iowa Barnstormers of the Indoor Football
League.
The Simon Estes Riverfront Amphitheater is an outdoor concert venue on the east bank
of the Des Moines River which hosts music events such as the Alive Concert Series.
The Des Moines Art Center, with a wing designed by architect I. M. Pei, presents art
```

</details>

**Model answer, top 10:**

> The Iowa Barnstormers of the Indoor Football League, the Iowa Wild of the American Hockey League, and the Iowa Wolves of the NBA G League play in the Wells Fargo Arena.

Your grade (top 10): ____c(woulg have been best if it also mentioned the word home)

**Model answer, top 15:**

> The Iowa Barnstormers of the Indoor Football League, the Iowa Wild of the American Hockey League, and the Iowa Wolves of the NBA G League play in the Wells Fargo Arena.

Your grade (top 15): ____

---

## 6. `feta-0485` (feta, Key signature)

**Question:** How many flats do the keys of F and B♭ major have?

**Reference answer:** F major (D minor) has one flat which is on the B; then B♭ major (G minor) has two flats (on B and E).

**Answer chunks:** 4 labelled:

<details><summary>chunk #16 (search rank 2)</summary>

```text
fifth adds a flat, going counterclockwise
around the circle of fifths. The new flat is
placed on the subdominant (fourth degree)
for major keys or submediant (sixth degree)
for minor keys. Thus F major (D minor) has
one flat which is on the B; then B♭ major (G minor) has two flats (on B and E) and so on.
Put another way: for key signatures with sharps, the first sharp is placed on F with subsequent sharps on C, G,
```

</details>

<details><summary>chunk #50 (search rank 3)</summary>

```text
Key signature Added ♯ Major key Minor key Key signature Added ♭ Major key Minor key
1 sharp
F♯ G major E minor
1 flat
B♭ F major D minor
2 sharps
C♯ D major B minor
2 flats
E♭ B♭ major G minor
3 sharps
G♯ A major F♯ minor
3 flats
A♭ E♭ major C minor
4 sharps
D♯ E major C♯ minor
4 flats
D♭ A♭ major F minor
5 sharps
A♯ B major G♯ minor
5 flats
G♭ D♭ major B♭ minor
6 sharps
E♯ F♯ major D♯ minor
6 flats
C♭ G♭ major E♭ minor
```

</details>

<details><summary>chunk #36 (search rank 5)</summary>

```text
A♭ D♭), for example, the penultimate flat is A♭, indicating a key of A♭ major.
Major key Number
of flats Flat notes Minor key Enharmonic
equivalent
C major 0 A minor None
F major 1 B♭ D minor None
B♭ major 2 B♭, E♭ G minor None
E♭ major 3 B♭, E♭, A♭ C minor None
A♭ major 4 B♭, E♭, A♭, D♭ F minor None
D♭ major 5 B♭, E♭, A♭, D♭, G♭ B♭ minor C♯ major/A♯ minor
G♭ major 6 B♭, E♭, A♭, D♭, G♭, C♭ E♭ minor F♯ major/D♯ minor
C♭ major 7 B♭, E♭, A♭, D♭, G♭, C♭, F♭ A♭ minor B major/G♯ minor
```

</details>

<details><summary>chunk #33 (not in search top 20)</summary>

```text
equivalent
C major 0 A minor None
G major 1 F♯ E minor None
D major 2 F♯, C♯ B minor None
A major 3 F♯, C♯, G♯ F♯ minor None
E major 4 F♯, C♯, G♯, D♯ C♯ minor None
B major 5 F♯, C♯, G♯, D♯, A♯ G♯ minor C♭ major/A♭ minor
F♯ major 6 F♯, C♯, G♯, D♯, A♯, E♯ D♯ minor G♭ major/E♭ minor
C♯ major 7 F♯, C♯, G♯, D♯, A♯, E♯, B♯ A♯ minor D♭ major/B♭ minor
This table shows that each scale starting on the fifth scale degree of the previous scale has one new sharp, added
in the order given above.[6]
```

</details>

**Model answer, top 10:**

> The key of F major has 1 flat, and the key of B♭ major has 2 flats.

Your grade (top 10): ____c(would love it be a little more elaborative like mentioned the nemaes as is there in teh referenced answer)

**Model answer, top 15:**

> The key of F major has 1 flat, and the key of B♭ major has 2 flats.

Your grade (top 15): ____

---

## 7. `feta-0526` (feta, List of undefeated boxing world champions)

**Question:** What is Floyd Mayweather's Jr.'s overall career record, and in how many weight classes did he earn world titles?

**Reference answer:** In Floyd Mayweather Jr.'s career, he held multiple world titles in five weight classes (twice at welterweight) and retired with an undefeated record.

**Answer chunks:** 1 labelled:

<details><summary>chunk #4 (search rank 1)</summary>

```text
Vacated title
to move up to
junior
flyweight.
Light flyweight IBF 1999–2002 2
Rocky Marciano[3][6] 49–0–0 (0) Heavyweight World 1952–1956 6
Terry Marsh[3][4] 26–0–1 (0) Light welterweight IBF 1987 1
Retired from
boxing due to
epilepsy.
Floyd Mayweather Jr.[7] 50–0–0 (0)
Super featherweight WBC 1998–2002 8
Vacated title
to move up to
lightweight.
Lightweight WBC 2002–2004 3
Vacated title
to move up to
light
welterweight.
Light welterweight WBC 2005–2006 0
Vacated title
to move up to
```

</details>

**Model answer, top 10:**

> Floyd Mayweather Jr.'s overall career record is 50–0–0 (0). He earned world titles in four weight classes: super featherweight, lightweight, light welterweight, and welterweight.

Your grade (top 10): ____c

**Model answer, top 15:**

> Floyd Mayweather Jr.'s overall career record is 50–0–0 (0). He earned world titles in four weight classes: super featherweight, lightweight, light welterweight, and welterweight.

Your grade (top 15): ____

---

## 8. `feta-0446` (feta, Gianfranco Zola)

**Question:** When and where did Gianfranco Zola score his first two goals?

**Reference answer:** Gianfranco Zola's first two goals came on 25 March 1995, in a 4–1 win, in a Euro 1996 qualifier against Estonia in Salerno.

**Answer chunks:** 2 labelled:

<details><summary>chunk #32 (search rank 1)</summary>

```text
appearance in the second round knock-out match against Nigeria in Boston. After only twelve minutes, Zola was
controversially sent off, after fouling Augustine Eguavoen, which forced him to miss the two subsequent World Cup
matches.[36][37] Although Italy managed to reach the World Cup final, Zola did not regain his place in the side after this
suspension.[38] His first two goals came on 25 March 1995, in a 4–1 win, in a Euro 1996 qualifier against Estonia in
Salerno.[2][39]
```

</details>

<details><summary>chunk #36 (not in search top 20)</summary>

```text
# Date Venue Opponent Score Result Competition
1. 25 March 1995 Stadio Arechi, Salerno Estonia 1–0 4–1 Euro 1996 qualifier
2. 3–0
3. 29 March 1995 Republikan Stadium, Kiev Ukraine 2–0 2–0 Euro 1996 qualifier
4. 26 April 1995 Žalgiris Stadium, Vilnius Lithuania 1–0 1–0 Euro 1996 qualifier
5.
15 November 1995 Stadio Giglio, Reggio Emilia Lithuania
2–0
4–0 Euro 1996 qualifier6. 3–0
7. 4–0
8. 22 January 1997 Stadio La Favorita, Palermo Northern Ireland 1–0 2–0 Friendly
```

</details>

**Model answer, top 10:**

> Gianfranco Zola scored his first two goals on 25 March 1995, in a 4–1 win, in a Euro 1996 qualifier against Estonia in Salerno.

Your grade (top 10): ____c

**Model answer, top 15:**

> Gianfranco Zola scored his first two goals on 25 March 1995, in a 4–1 win against Estonia in a Euro 1996 qualifier in Salerno.

Your grade (top 15): ____

---

## 9. `feta-0546` (feta, New Kids on the Block)

**Question:** How many awards did new kids on the block win in 1990 at the American music awards?

**Reference answer:** New Kids on the Block won two American Music Awards in 1990 for Favorite Pop/Rock Band/Duo/Group and Favorite Pop/Rock Album.

**Answer chunks:** 3 labelled:

<details><summary>chunk #0 (search rank 1)</summary>

```text
New Kids on the Block
New Kids on the Block (also initialized as NKOTB) is an American boy band from Boston, Massachusetts.
The band currently consists of brothers Jordan and Jonathan Knight, Joey McIntyre, Donnie Wahlberg, and
Danny Wood. New Kids on the Block enjoyed success in the late 1980s and early 1990s and have sold more
than 80 million records worldwide.[1][2] They won two American Music Awards in 1990 for Favorite Pop/Rock
```

</details>

<details><summary>chunk #18 (search rank 2)</summary>

```text
donated to United Cerebral Palsy, the New Kids' favorite charitable cause. Hangin' Tough would go on to spend
132 weeks on the chart, and in January 1990, the album won two American Music Awards for "Best Pop/Rock
Album", and "Best Pop/Rock Group". With the success of "Didn't I (Blow Your Mind)", "Cover Girl", and "This
One's For the Children", the group pulled off a rare feat of having three singles on the Billboard Hot 100 at the
same time, but each from a different album.
```

</details>

<details><summary>chunk #59 (search rank 3)</summary>

```text
Mixtape Tour (with Salt-N-Pepa, Naughty by Nature, Tiffany and Debbie Gibson) (2019)
Year Association Category Nominated work Result
1990 Grammy Awards Best Music Video, Long Form "Hangin' Tough" Nominated
1990
American Music Awards
Favorite Pop/Rock Band/Duo/Group Won
Favorite Pop/Rock Album Hangin' Tough Won
1991 Favorite Pop/Rock Band/Duo/Group Nominated
1. Loffredi, Julie (1 July 2015). "5 New Kids on the Block landmarks fans must see" (http://www.foxne
```

</details>

**Model answer, top 10:**

> New Kids on the Block won two American Music Awards in 1990 for Favorite Pop/Rock Band, Duo, or Group and Favorite Pop/Rock Album.

Your grade (top 10): ____c

**Model answer, top 15:**

> New Kids on the Block won two American Music Awards in 1990 for Favorite Pop/Rock Band, Duo, or Group and Favorite Pop/Rock Album.

Your grade (top 15): ____

---

## 10. `nq-0151` (nq, 2006 FIFA World Cup)

**Question:** where did italy win the world cup in 2006

**Reference answer:** Germany

**Answer chunks:** 2 labelled:

<details><summary>chunk #1 (search rank 8)</summary>

```text
match)
Attendance 3,359,439 (52,491
per match)
Top scorer(s) Miroslav
Klose
(5 goals)
Best player(s) Zinedine
Zidane
Best young
player
Lukas
Podolski
Best
goalkeeper
Gianluigi
Buffon
Fair play award Brazil
Spain
2006 FIFA World Cup
The 2006 FIFA World Cup was the 18th FIFA World Cup, the quadrennial international football world
championship tournament. It was held from 9 June to 9 July 2006 in Germany, which won the right to host the event
```

</details>

<details><summary>chunk #0 (search rank 11)</summary>

```text
2006 FIFA World Cup
FIFA Fußball-Weltmeisterschaft
Deutschland 2006
2006 FIFA World Cup official logo
Eine Zeit, um Freunde zu finden
(A time to make friends)
Tournament details
Host country Germany
Dates 9 June – 9 July
Teams 32 (from 6
confederations)
Venue(s) 12 (in 12 host
cities)
Final positions
Champions Italy (4th title)
Runners-up France
Third place Germany
Fourth place Portugal
Tournament statistics
Matches played 64
Goals scored 147 (2.3 per
match)
Attendance 3,359,439 (52,491
```

</details>

**Model answer, top 10:**

> Italy won the 2006 FIFA World Cup in Germany.

Your grade (top 10): ____c( would best if it also mentioned more facts like the final match was help against xyz in ...)

**Model answer, top 15:**

> Italy won the 2006 FIFA World Cup in Germany. The final match was held at the Olympiastadion in Berlin.

Your grade (top 15): ____

---

## 11. `tat-0770` (tat, sykes-enterprises-incorporated_2019)

**Question:** In which year was the Weighted average grant-date fair value per share award the largest?

**Reference answer:** ['2017']

**Answer chunks:** 122 labelled, showing the 5 search ranked highest:

<details><summary>chunk #854 (search rank 1)</summary>

```text
thousands, except per share award amounts):
Years Ended December 31,
2019 2018 2017
Number of share awards granted 34 34 24
Weighted average grant-date fair value per share award $ 25.41 $ 27.68 $ 32.93
Fair value of share awards vested $ 840 $ 880 $ 850
As of December 31, 2019, there was $0.2 million of total unrecognized compensation costs, net of actual forfeitures,
related to nonvested common stock share awards. This cost is expected to be recognized over a weighted average
```

</details>

<details><summary>chunk #862 (search rank 7)</summary>

```text
except per common stock amounts):
Years Ended December 31,
2019 2018 2017
Number of shares of common stock granted 16 16 13
Weighted average grant-date fair value per common stock $ 29.10 $ 28.48 $ 30.49
Fair value of common stock vested $ 320 $ 315 $ 334
Cash used to settle the obligation $ 366 $ 804 $ 1,134
As of December 31, 2019, there was $0.2 million of total unrecognized compensation cost, net of actual forfeitures,
```

</details>

<details><summary>chunk #791 (search rank 14)</summary>

```text
The number of shares used in the earnings per share computation were as follows (in thousands):
Years Ended December 31,
2019 2018 2017
Basic:
Weighted average common shares outstanding 41,649 42,090 41,822
Diluted:
Dilutive effect of stock appreciation rights, restricted
stock, restricted stock units and shares held in
rabbi trust 153 156 319
Total weighted average diluted shares outstanding 41,802 42,246 42,141
Anti-dilutive shares excluded from the diluted earnings
```

</details>

<details><summary>chunk #836 (search rank 15)</summary>

```text
98
The following table summarizes information regarding SARs granted and exercised (in thousands, except per SAR
amounts):
Years Ended December 31,
2019 2018 2017
Number of SARs granted — 333 396
Weighted average grant-date fair value per SAR $ — $ 6.84 $ 6.24
Intrinsic value of SARs exercised $ 4,893 $ 320 $ 1,763
Fair value of SARs vested $ 2,053 $ 1,950 $ 1,846
The following table summarizes nonvested SARs activity as of December 31, 2019 and for the year then ended:
```

</details>

<details><summary>chunk #7 (not in search top 20)</summary>

```text
FELLOW SHAREHOLDERS,
2019 provided further evidence that SYKES’ fundamentals are starting to
rebound. Not only did 2019 mark the start of recovery in our operating
margin performance, it also set us up for a solid revenue growth trajectory
going into 2020. Recall, our focus in 2017 and 2018 was to rationalize
excess capacity to increase capacity utilization and improve operating
margins. We achieved significant success on that front. Another focus area
```

</details>

**Model answer, top 10:**

> The weighted average grant-date fair value per share award was the largest in 2017 at $32.93.

Your grade (top 10): ____c

**Model answer, top 15:**

> The weighted average grant-date fair value per share award was the largest in 2017 at $32.93.

Your grade (top 15): ____

---

## 12. `financebench-0065` (financebench, BOEING_2022_10K)

**Question:** What production rate changes is Boeing forecasting for FY2023?

**Reference answer:** Boeing forecasts an increase in the production rates for the 737, 777X and 787 aircrafts in 2023.

**Answer chunks:** 3 labelled:

<details><summary>chunk #75 (search rank 1)</summary>

```text
meet customer demand and maintain our profitability. We have previously announced plans to adjust production rates on several of our
commercial aircraft programs. The 787 program is currently producing at low rates and we expect to gradually increase to 5 per month in 2023.
Production of the 777X is currently paused and is expected to resume in 2023. The 737 program has experienced operational and supply chain
```

</details>

<details><summary>chunk #76 (search rank 2)</summary>

```text
challenges stabilizing production at 31 per month. We plan to gradually increase 737 production rates based on market demand and supply
chain capacity. In addition, we continue to seek opportunities to reduce the costs of building our aircraft, including working with our suppliers to
reduce supplier costs, identifying and implementing productivity improvements and optimizing how we manage inventory. If production rate
changes at any of our
7
```

</details>

<details><summary>chunk #74 (search rank 7)</summary>

```text
deliveries based on delivery delays. Delays on the 737, 777X and 787 programs have resulted in, and may continue to result in, customers
having the right to terminate orders, be compensated for late deliveries and/or substitute orders for other Boeing aircraft.
We must minimize disruption caused by production changes, achieve operational stability and implement productivity improvements in order to
```

</details>

**Model answer, top 10:**

> Boeing is forecasting a gradual increase in production rates for the 787 program to 5 per month in 2023. The 737 program, which was producing at 31 per month, will also see gradual increases based on market demand and supply chain capacity. The 777X production is expected to resume in 2023.

Your grade (top 10): ____c(but the top 15 ans was better)

**Model answer, top 15:**

> Boeing is forecasting a gradual increase in production rates for its commercial aircraft programs in FY2023. The 787 program is currently producing at low rates and is expected to gradually increase to 5 per month in 2023. The 737 program, which stabilized at 31 per month, plans to gradually increase production rates based on market demand and supply chain capacity. The 777X program's production is currently paused and is expected to resume in 2023.

Your grade (top 15): ____

---

## 13. `nq-0176` (nq, Carly Chaikin)

**Question:** who played elliot's sister in mr robot

**Reference answer:** Carly Hannah Chaikin (

**Answer chunks:** 2 labelled:

<details><summary>chunk #1 (search rank 4)</summary>

```text
the role until the series' cancellation in 2014, and one year later began
playing the role of Darlene in the critically acclaimed USA Network
television drama Mr. Robot.
Chaikin was born in Santa Monica, California, to a cardiologist father
and a physiotherapist mother. She was raised Jewish.[1][2]
She went to The Archer School for Girls, a high school in Los Angeles.
During this time she played a variety of sports, including volleyball,
softball, basketball, and soccer.[3]
```

</details>

<details><summary>chunk #0 (search rank 7)</summary>

```text
Carly Chaikin
File:Carly Chaikin - Hargrave.jpeg
Born March 26, 1990
Santa Monica,
California, U.S.
Occupation Actress
Years active 2009–present
Notable work Mr. Robot (2015–
present)
Suburgatory (2011–
14)
The Last Song
(2010)
Carly Chaikin
Carly Hannah Chaikin (born March 26, 1990) is an American actress.
She began acting in 2009 and received her breakout role two years later,
co-starring as Dalia Royce in the ABC sitcom Suburgatory. She played
```

</details>

**Model answer, top 10:**

> Carly Chaikin played Elliot's sister in Mr. Robot.

Your grade (top 10): ____pc(missied full name)

**Model answer, top 15:**

> Carly Chaikin played Elliot's sister in Mr. Robot.

Your grade (top 15): ____

---

## 14. `nq-0249` (nq, Kelly Bishop)

**Question:** who played baby's mother in the original dirty dancing

**Reference answer:** Carole `` Kelly '' Bishop (

**Answer chunks:** 2 labelled:

<details><summary>chunk #1 (search rank 1)</summary>

```text
Grey's Frances "Baby" Houseman in the film Dirty Dancing. Bishop
created the role of Sheila in A Chorus Line, for which she won a Tony
Award for Best Performance by a Featured Actress in a Musical. She
also starred as Fanny Flowers in the ABC Family short-lived comedy-
drama series Bunheads.
Bishop was born in Colorado Springs, Colorado, to Jane Lenore (née
Wahtola) and Lawrence Boden Bishop.[1] She grew up in Denver,
Colorado, where she trained to be a ballet dancer, attending the San Jose
```

</details>

<details><summary>chunk #0 (search rank 4)</summary>

```text
Kelly Bishop
Bishop at the ATX TV Festival 2015
for the TV show Gilmore Girls
Born Carole Bishop
February 28, 1944
Colorado Springs,
Colorado, USA
Occupation(s) Actress, dancer
Years active 1962–present
Spouse(s) Peter Miller
(divorced)
Lee Leonard
(1981–present)
Kelly Bishop
Carole "Kelly" Bishop (born February 28, 1944) is an American actress
and dancer, best known for her roles as matriarch Emily Gilmore on the
series Gilmore Girls and as Marjorie Houseman, the mother of Jennifer
```

</details>

**Model answer, top 10:**

> Kelly Bishop played Baby's mother in the original Dirty Dancing.

Your grade (top 10): ____pc(full name again missing)

**Model answer, top 15:**

> Kelly Bishop played Baby's mother in the original Dirty Dancing.

Your grade (top 15): ____

---

## 15. `feta-0558` (feta, Prime Minister of Jamaica)

**Question:** Who succeeded Portia Simpson-Miller in her second run as the Prime Minister of Jamaica and when did they replace her?

**Reference answer:** Holness, of the Jamaica Labour Party (JLP), became Prime Minister of Jamaica on 3 March 2016, succeeding the People's National Party's (PNP) Portia Simpson-Miller.

**Answer chunks:** 4 labelled:

<details><summary>chunk #2 (search rank 1)</summary>

```text
Website www.opm.jm (http://www.opm.
gov.jm/)
Front Lawns of Vale Royal
The Prime Minister of Jamaica is Jamaica's head of government, currently Andrew Holness. Holness, as leader of the
governing Jamaica Labour Party (JLP), was sworn in as Prime Minister on 3 March 2016, succeeding People's National
Party (PNP) leader Portia Simpson-Miller.[1] This was a result of the JLP's victory in Jamaica's 25 February 2016
general election.
```

</details>

<details><summary>chunk #12 (search rank 3)</summary>

```text
10 February 1989
1 November 1980
30 March 1992
11 years, 292 days
(8 years, 244 days;
3 years, 48 days)
2
1972
1976
1989
People's National Party
3 Edward Seaga 1 November 1980 10 February 1989 8 years, 101 days 1 1980
1983 Jamaica Labour Party
4 Portia Simpson Miller 30 March 2006
5 January 2012
11 September 2007
3 March 2016
5 years, 167 days
(1 year, 165 days;
4 years, 58 days)
2 2011 People's National Party
5 Hugh Shearer 11 April 1967 2 March 1972 4 years, 326 days 1 Jamaica Labour Party
```

</details>

<details><summary>chunk #10 (search rank 5)</summary>

```text
(1945–)
30 March
2006
11 S
style="background:Template:Jamaica Labour Party/meta/color; color:white;" | 8 Bruce Golding
(1947–)
11 September
2007
23
style="background:Template:Jamaica Labour Party/meta/color; color:white;" | 9 File:Andrew Holness cropped.jpg Andrew Holness
(1972–)
23 October
2011
5
style="background:Template:People's National Party/meta/color; color:white;" | (7) Portia Simpson-Miller
(1945–)
5 January
2012
3
```

</details>

<details><summary>chunk #11 (search rank 7)</summary>

```text
(1945–)
5 January
2012
3
style="background:Template:Jamaica Labour Party/meta/color; color:white;" | (9) File:Andrew Holness cropped.jpg Andrew Holness
(1972–)
3 March
2016 Inc
Notes
^† Died in office
Rank by
length
of terms
Prime Minister Took office Left office Length by
time served Administrations Elected Political affiliation
1 P. J. Patterson 30 March 1992 30 March 2006 14 years 1
1993
1997
2002
People's National Party
2 Michael Manley 2 March 1972
10 February 1989
1 November 1980
```

</details>

**Model answer, top 10:**

> Andrew Holness succeeded Portia Simpson-Miller as the Prime Minister of Jamaica on 3 March 2016.

Your grade (top 10): ____c(here the full name is present which is excellent)

**Model answer, top 15:**

> Andrew Holness succeeded Portia Simpson-Miller in her second run as the Prime Minister of Jamaica. He replaced her on 3 March 2016.

Your grade (top 15): ____

---

## 16. `tat-0694` (tat, hc2-holdings-inc_2019)

**Question:** What was the cost of revenue for the year ended December 31, 2019?

**Reference answer:** ['$23.5 million']

**Answer chunks:** 2 labelled:

<details><summary>chunk #1004 (search rank 12)</summary>

```text
local advertising sales as a result of such restructuring. This was partially offset by higher broadcast stations revenue associated with stations acquired during and subsequent
to the comparable period.
Cost of revenue: Cost of revenue from our Broadcasting segment for the year ended December 31, 2019 decreased $5.0 million to $23.5 million from $28.5 million for the
```

</details>

<details><summary>chunk #1709 (not in search top 20)</summary>

```text
VOBA
VOBA is amortized in relation to the projected future premium of the acquired long-term care blocks of business and recorded amortization increases net income for the
respective period. Negative amortization of VOBA was $23.5 million and $12.8 million for the years ended December 31, 2019 and 2018, respectively,
Amortization
Excluding the impact of any future acquisitions, dispositions or change in foreign currency, the Company estimates the annual amortization expense of amortizable
```

</details>

**Model answer, top 10:**

> The cost of revenue for the year ended December 31, 2019 was $1,949.5 million.

Your grade (top 10): ____w( the corrent ans 23...million was mentioned in the chunk but a wrong asnwe was presented)

**Model answer, top 15:**

> The cost of revenue for the year ended December 31, 2019 was $1,370.8 million.

Your grade (top 15): ____

---

## 17. `feta-0448` (feta, Grand Prix motorcycle racing)

**Question:** How many cc's does the Triumph engine have in contrast to the Honda's?

**Reference answer:** The Triumph engine boasts 765cc displacement with 3 cylinders in contrast with the Honda's 600cc in-line four.

**Answer chunks:** 1 labelled:

<details><summary>chunk #64 (not in search top 20)</summary>

```text
The MotoE World Cup is introduced in 2019 and features all-electric motorcycles. The series will be using a
spec Energica Ego Corsa motorcycle, manufactured by Energica Motor Company.[27][28] The first season is
contested over 6 rounds (at 5 different Grand Prix weekends).
Specification MotoGP Moto2 Moto3
Manufacturer Various Honda (2010–2018)
Triumph (from 2019) Various
Configuration 75.5°-90° V4/Inline-four Inline-four (2010–2018)
Inline-three (from 2019) single-cylinder
```

</details>

**Model answer, top 10:**

> The Triumph engine has 765 cc displacement in contrast to the previous Honda's 600 cc.

Your grade (top 10): ____c(woule be best if a little infoextra  would have been provided like the referenced answer ont)

**Model answer, top 15:**

> The Triumph engine has 765 cc displacement, in contrast to the previous Honda's 600 cc.

Your grade (top 15): ____

---

## 18. `nq-0297` (nq, Los Angeles Open)

**Question:** where is the genesis open being played at

**Reference answer:** Valencia Country Club

**Answer chunks:** 3 labelled:

<details><summary>chunk #2 (search rank 5)</summary>

```text
The tournament has been held at Riviera on a near-continuous basis since 1973. South Korea-
based Hyundai Motor Group, through its Genesis Motors subsidiary, took over sponsorship in
2017, after nine seasons from Northern Trust Corporation, based in Chicago, following a 21-
year sponsorship by Nissan Motors. Entertainer Glen Campbell was the celebrity host of the
Los Angeles Open from 1971 to 1983.
Listed by most recent
Times
hosted Venue Location Years
56 Riviera Country Club Pacific
Palisades
```

</details>

<details><summary>chunk #3 (not in search top 20)</summary>

```text
56 Riviera Country Club Pacific
Palisades
1929–30, 1941, 1945–53,
1973–82, 1984–97, 1999–
2018
1 Valencia Country Club Valencia 1998
17 Rancho Park Golf
Course
Los
Angeles 1956–67, 1969–72, 1983
1 Brookside Golf Course Pasadena 1968
1 Inglewood Country Club Inglewood 1955
1 Fox Hills Country Club Culver City 1954
4 Wilshire Country Club Los
Angeles 1928, 1931, 1933, 1944
2 Hillcrest Country Club Los
Angeles 1932, 1942
5 Los Angeles Country
Club
Los
Angeles 1926, 1934–36, 1940
```

</details>

<details><summary>chunk #4 (not in search top 20)</summary>

```text
Club
Los
Angeles 1926, 1934–36, 1940
3 Griffith Park Los
Angeles 1937–39
1 El Caballero Country
Club Tarzana 1927
Not held in 1943
This is an old revision of this page, as edited by Glacier109 (talk | contribs) at 21:54, 21 April 2018 (→ Tournament sites).
The present address (URL) is a permanent link to this revision, which may differ significantly from the current revision.
Riviera C.C.
Riviera C.C.
Tournament sites
History
```

</details>

**Model answer, top 10:**

> The Genesis Open is being played at the Riviera Country Club in Pacific Palisades, California.

Your grade (top 10): ____tough to say (check the referred wans was correct or not and also where ehere the correct chubk was)

**Model answer, top 15:**

> The Genesis Open is being played at the Riviera Country Club in Pacific Palisades, California.

Your grade (top 15): ____

---

## 19. `tat-0711` (tat, international-business-machines-corp_2019)

**Question:** What is the average of Balance at December 31?

**Reference answer:** 6978.67

**Answer chunks:** 1 labelled:

<details><summary>chunk #910 (not in search top 20)</summary>

```text
unrecognized tax benefits was as follows:
($ in millions)
2019 2018 2017
Balance at January 1 $6,759 $ 7,031 $3,740
Additions based on tax
positions related to the
current year 816 394 3,029
Additions for tax positions
of prior years 779 1,201 803
Reductions for tax positions
of prior years (including
impacts due to a lapse of
statute) (922) (1,686) (367)
Settlements (286) (181) (174)
Balance at December 31 $7,146 $ 6,759 $7,031
The additions to unrecognized tax benefits related to the current
```

</details>

**Model answer, top 10:**

> The provided context is insufficient to answer this question.

Your grade (top 10): ____

**Model answer, top 15:**

> The provided context is insufficient to answer this question.

Your grade (top 15): ____

---

## 20. `financebench-0011` (financebench, ADOBE_2016_10K)

**Question:** What is Adobe's year-over-year change in unadjusted operating income from FY2015 to FY2016 (in units of percents and round to one decimal place)? Give a solution to the question by using the income statement.

**Reference answer:** 65.4%

**Answer chunks:** 18 labelled, showing the 5 search ranked highest:

<details><summary>chunk #627 (search rank 5)</summary>

```text
Table of Contents
62
ADOBE SYSTEMS INCORPORATED
CONSOLIDATED STATEMENTS OF INCOME
(In thousands, except per share data)
Years Ended
December 2,
2016 November 27,
2015 November 28,
2014
Revenue:
Subscription $ 4,584,833 $ 3,223,904 $ 2,076,584
Product 800,498 1,125,146 1,627,803
Services and support 469,099 446,461 442,678
Total revenue 5,854,430 4,795,511 4,147,065
Cost of revenue:
Subscription 461,860 409,194 335,432
Product 68,917 90,035 97,099
Services and support 289,131 245,088 189,549
```

</details>

<details><summary>chunk #640 (search rank 6)</summary>

```text
Table of Contents
65
ADOBE SYSTEMS INCORPORATED
CONSOLIDATED STATEMENTS OF CASH FLOWS
(In thousands)
Years Ended
December 2,
2016 November 27,
2015 November 28,
2014
Cash flows from operating activities:
Net income $ 1,168,782 $ 629,551 $ 268,395
Adjustments to reconcile net income to net cash provided by operating activities:
Depreciation, amortization and accretion 331,535 339,473 313,590
Stock-based compensation 349,912 335,859 333,701
Deferred income taxes 24,222 (69,657) (26,089)
```

</details>

<details><summary>chunk #631 (search rank 8)</summary>

```text
Table of Contents
63
ADOBE SYSTEMS INCORPORATED
CONSOLIDATED STATEMENTS OF COMPREHENSIVE INCOME
(In thousands)
Years Ended
December 2,
2016 November 27,
2015 November 28,
2014
Increase/(Decrease)
Net income $ 1,168,782 $ 629,551 $ 268,395
Other comprehensive income (loss), net of taxes:
Available-for-sale securities:
Unrealized gains / losses on available-for-sale securities (1,618) (9,226) 2,315
Reclassification adjustment for recognized gains / losses on available-
```

</details>

<details><summary>chunk #806 (search rank 13)</summary>

```text
Table of Contents
ADOBE SYSTEMS INCORPORATED
NOTES TO CONSOLIDATED FINANCIAL STATEMENTS (Continued)
85
NOTE 9. INCOME TAXES
Income before income taxes for fiscal 2016, 2015 and 2014 consisted of the following (in thousands):
2016 2015 2014
Domestic $ 805,749 $ 589,371 $ 191,563
Foreign 629,389 284,410 169,813
Income before income taxes $ 1,435,138 $ 873,781 $ 361,376
The provision for income taxes for fiscal 2016, 2015 and 2014 consisted of the following (in thousands):
2016 2015 2014
Current:
```

</details>

<details><summary>chunk #392 (not in search top 20)</summary>

```text
Item 7, Management’s Discussion and Analysis of Financial Condition and Results of Operations.
Fiscal Years
2016 2015 2014 2013 2012
Operations:
Revenue $ 5,854,430 $ 4,795,511 $ 4,147,065 $ 4,055,240 $ 4,403,677
Gross profit $ 5,034,522 $ 4,051,194 $ 3,524,985 $ 3,468,683 $ 3,919,895
Income before income taxes $ 1,435,138 $ 873,781 $ 361,376 $ 356,141 $ 1,118,794
Net income $ 1,168,782 $ 629,551 $ 268,395 $ 289,985 $ 832,775
Net income per share:
Basic $ 2.35 $ 1.26 $ 0.54 $ 0.58 $ 1.68
```

</details>

**Model answer, top 10:**

> The year-over-year change in unadjusted operating income from FY2015 to FY2016 is 12.0%.

Your grade (top 10): ____

**Model answer, top 15:**

> The year-over-year change in unadjusted operating income from FY2015 to FY2016 is 12.0%.

Your grade (top 15): ____

---

## 21. `tat-0746` (tat, overseas-shipholding-group-inc_2019)

**Question:** What benefits are provided by the company to qualifying domestic retirees and their eligible dependents?

**Reference answer:** ['certain postretirement health care and life insurance benefits']

**Answer chunks:** 1 labelled:

<details><summary>chunk #786 (search rank 1)</summary>

```text
Postretirement Benefit Plans
The Company also provides certain postretirement health care and life insurance benefits to qualifying domestic retirees and their
eligible dependents. The health care plan for shore-based employees and their dependents and seagoing licensed deck officers
(“Deck Officers”) and their dependents is contributory at retirement, while the life insurance plan for all employees is
```

</details>

**Model answer, top 10:**

> The company provides certain postretirement health care and life insurance benefits to qualifying domestic retirees and their eligible dependents. The health care plan for shore-based employees and their dependents and seagoing licensed deck officers and their dependents is contributory at retirement, while the life insurance plan for all employees is noncontributory. Postretirement medical coverage is provided to shore-based employees hired prior to January 1, 2005, and all Deck Officers who retire and have met minimum age and service requirements. The company does not currently fund these benefit arrangements and has the right to amend or terminate the health care and life insurance benefits at any time.

Your grade (top 10): ____

**Model answer, top 15:**

> The company provides certain postretirement health care and life insurance benefits to qualifying domestic retirees and their eligible dependents. The health care plan for shore-based employees and their dependents and seagoing licensed deck officers and their dependents is contributory at retirement, while the life insurance plan for all employees is noncontributory. Postretirement medical coverage is provided to shore-based employees hired prior to January 1, 2005, and all Deck Officers who retire and have met minimum age and service requirements. The company does not currently fund these benefit arrangements and has the right to amend or terminate the health care and life insurance benefits at any time.

Your grade (top 15): ____

---

## 22. `feta-0442` (feta, Gangnam Style)

**Question:** In which city was the Mnet Asian Music Awards held in 2012?

**Reference answer:** In 2012, Mnet Asian Music Awards was held in Hong Kong.

**Answer chunks:** 2 labelled:

<details><summary>chunk #97 (search rank 1)</summary>

```text
Muang Thong Thani, Bangkok. At the show, a part of celebration for the 85th birthday of Thai's King Bhumibol
Adulyadej, he performed the song along with his other hits.[232][233] During the 2012 Mnet Asian Music Awards held in
Hong Kong on November 30, he performed the song on stage, joined by the video's co-star Hyuna and Yoo Jae-Seok
look-alikes in yellow suits.[234] The track was one of three-song setlist on Psy's free showcase, held at the Marina Bay
```

</details>

<details><summary>chunk #125 (search rank 2)</summary>

```text
Credits adapted from Psy 6 (Six Rules), Part 1 EP liner notes and YG Entertainment official website.
Year Country Host
City Ceremony Award Result Ref
2012
Germany Frankfurt MTV Europe Music
Awards Best Video Won [286]
United States Los
Angeles
American Music
Awards New Media Honoree Won [287]
South Korea Hong Kong Mnet Asian Music
Awards
Best Video Won [288]
Song of the Year Won [288]
United
Kingdom — 4Music Video
Honours Best Video Nominated [289]
```

</details>

**Model answer, top 10:**

> The Mnet Asian Music Awards was held in Hong Kong in 2012.

Your grade (top 10): ____

**Model answer, top 15:**

> The Mnet Asian Music Awards in 2012 was held in Hong Kong.

Your grade (top 15): ____

---

## 23. `financebench-0098` (financebench, JPMORGAN_2023Q2_10Q)

**Question:** Looking at VaR, did the risk that JPM faced in the second fiscal quarter of 2023 decrease compared to the same period in the prior year?

**Reference answer:** Yes. It decreased.

**Answer chunks:** 17 labelled, showing the 5 search ranked highest:

<details><summary>chunk #628 (search rank 1)</summary>

```text
period in the prior year predominantly driven by risk
reductions impacting Credit Portfolio VaR as well as fixed
income.
The following graph presents daily Risk Management VaR for the five trailing quarters.
Daily Risk Management VaR$ millions
0
50
100
Second Quarter
2022 Third Quarter
2022 Fourth Quarter
2022 First Quarter
2023 Second Quarter
2023
85
```

</details>

<details><summary>chunk #627 (search rank 4)</summary>

```text
volatility in the nickel market which occurred during the first quarter of 2022.
Quarter over quarter results
Average total VaR was flat for the three months ended
June 30, 2023, when compared with March 31, 2023,
reflecting increases in fixed income offset by market volatility
relating to commodities rolling out of the one-year historical
look-back period.
Year over year results
Average total VaR decreased by $7 million for the three
months ended June 30, 2023, compared with the same
```

</details>

<details><summary>chunk #76 (not in search top 20)</summary>

```text
(a) Included operating lease income of $716 million and $945 million for the three months ended June 30, 2023 and 2022, respectively, and $1.5 billion and
$2.0 billion for the six months ended June 30, 2023 and 2022, respectively, and an estimated bargain purchase gain of $2.7 billion associated with the
First Republic acquisition in Corporate for the three and six months ended June 30, 2023. Refer to Business Segment Results on page 24, and Notes 6 and
28 for additional information.
```

</details>

<details><summary>chunk #107 (not in search top 20)</summary>

```text
Other expense(b)(c) 2,586 1,593 62 4,225 3,011 40
Total noncompensation expense 9,606 8,448 14 18,037 16,852 7
Total noninterest expense $ 20,822 $ 18,749 11 % $ 40,929 $ 37,940 8 %
(a) Includes depreciation expense associated with auto operating lease assets.
(b) Included Firmwide legal expense of $420 million and $73 million for the three months ended June 30, 2023 and 2022, respectively, and $596 million
```

</details>

<details><summary>chunk #108 (not in search top 20)</summary>

```text
and $192 million for the six months ended June 30, 2023 and 2022, respectively; as well as FDIC-related expense of $338 million and $216 million for
the three months ended June 30, 2023 and 2022, respectively, and $655 million and $414 million for the six months ended June 30, 2023 and 2022,
respectively. Refer to Note 6 for additional information.
```

</details>

**Model answer, top 10:**

> The average total VaR decreased by $7 million for the three months ended June 30, 2023, compared with the same period in the prior year, predominantly driven by risk reductions impacting Credit Portfolio VaR as well as fixed income.

Your grade (top 10): ____

**Model answer, top 15:**

> The average total VaR decreased by $7 million for the three months ended June 30, 2023, compared with the same period in the prior year, predominantly driven by risk reductions impacting Credit Portfolio VaR as well as fixed income. Therefore, the risk that JPMorgan Chase faced in the second fiscal quarter of 2023 decreased compared to the same period in the prior year.

Your grade (top 15): ____

---

## 24. `financebench-0091` (financebench, JOHNSON_JOHNSON_2023_8K_dated-2023-08-30)

**Question:** What is the amount of the gain accruing to JnJ as a result of the separation of its Consumer Health business segment, as of August 30, 2023?

**Reference answer:** JnJ will make a gain of approximately $20 billion from the separation of its Consumer Health business segment.

**Answer chunks:** 10 labelled, showing the 5 search ranked highest:

<details><summary>chunk #13 (search rank 1)</summary>

```text
Consumer Health business financial results as discontinued operations, including a gain of approximately $20 billion in the third quarter of
2023.
```

</details>

<details><summary>chunk #10 (search rank 2)</summary>

```text
of equity stake in Kenvue
• Company maintains its quarterly dividend of $1.19 per share
New Brunswick, N.J. (August 30, 2023) – Johnson & Johnson (NYSE: JNJ) (“the Company”) today announced updates to its financials and
2023 guidance which reflect its operations as a company focused on transformational innovation in Pharmaceutical and MedTech. The
Company has published a recorded webinar for investors to provide additional context behind the updated financials and 2023 guidance
```

</details>

<details><summary>chunk #12 (search rank 3)</summary>

```text
proud of the focus and dedication of our employees worldwide to achieve this milestone, which we are confident will unlock near- and long-
term value for all of our stakeholders.”
As previously announced, the Company recently completed an exchange offer to finalize the separation of Kenvue Inc., formerly Johnson &
Johnson’s Consumer Health business. As a result of the completion of the exchange offer, Johnson & Johnson will now present its
```

</details>

<details><summary>chunk #8 (search rank 4)</summary>

```text
Exhibit 99.1
Johnson & Johnson Announces Updated Financials and 2023 Guidance Following Completion of the Kenvue
Separation
• Company expects increased 2023 Reported Sales Growth of 7.0% - 8.0%, Operational Sales Growth of 7.5% - 8.5%, and
Adjusted Operational Sales Growth of 6.2% - 7.2%; Figures exclude the COVID-19 Vaccine
• Company expects 2023 Adjusted Reported Earnings Per Share (EPS) of $10.00 - $10.10, reflecting increased growth of
```

</details>

<details><summary>chunk #5 (search rank 5)</summary>

```text
Item 2.02 Results of Operations and Financial Condition
Johnson & Johnson completed an exchange offer to finalize the separation of Kenvue Inc. (the "Kenvue Separation"). On August 30, 2023, Johnson &
Johnson issued the attached press release (Exhibit 99.1) providing updated financials and 2023 guidance following completion of the Kenvue Separation.
Item 9.01 Financial Statements and Exhibits
(d) Exhibits.
Exhibit No. Description of Exhibit
99.1 Press Release dated August 30, 2023
```

</details>

**Model answer, top 10:**

> The gain accruing to Johnson & Johnson as a result of the separation of its Consumer Health business segment is approximately $20 billion in the third quarter of 2023.

Your grade (top 10): ____

**Model answer, top 15:**

> The gain accruing to Johnson & Johnson as a result of the separation of its Consumer Health business segment is approximately $20 billion in the third quarter of 2023.

Your grade (top 15): ____

---

## 25. `feta-0574` (feta, Sam Underwood)

**Question:** In which Tony Walton-directed plays did Sam Underwood appear?

**Reference answer:** Sam Underwood appeared as Marchbanks in Candida and Alan Strang in Equus, both directed by Tony Walton.

**Answer chunks:** 2 labelled:

<details><summary>chunk #2 (search rank 1)</summary>

```text
Candida at the Irish Repertory Theatre, New York, in April
2010,[9] Underwood was asked to play the part of Alan Strang
in a production of Equus at the John Drew Theatre, East
Hampton, co-starring alongside Alec Baldwin.[6][10]
In 2013, Underwood was cast in the eighth season of television series Dexter in the recurring role of Zach
Hamilton, Dexter Morgan's "protégé".[3] He subsequently joined the third season of Homeland as Leo Carras.[3]
```

</details>

<details><summary>chunk #6 (search rank 2)</summary>

```text
2019–present Dynasty Adam Carrington Series regular (season 2)
Year Title Role Description
2013 The Last Keepers Oliver Sands Feature film (debut)
2016 Hello Again Leocadia Released (2017)
Year(s) Title Role Director(s) Location
2010 Candida Marchbanks Tony Walton Irish Repertory Theatre
2010 Equus Alan Strang Tony Walton John Drew Theater at Guild Hall
2010 Veritas Lumbard Ryan J. Davis HERE Arts Center
Personal life
Filmography
Television
Film
Theatre
```

</details>

**Model answer, top 10:**

> Sam Underwood appeared in the plays "Candida" and "Equus," which were directed by Tony Walton.

Your grade (top 10): ____

**Model answer, top 15:**

> Sam Underwood appeared in the plays Candida and Equus, both directed by Tony Walton.

Your grade (top 15): ____

---

## 26. `feta-0580` (feta, Six Flags Over Georgia)

**Question:** What rides did "Gotham City" include in 2015 and what are their types?

**Reference answer:** In 2015, "Gotham City" included "The Joker: Chaos Coaster", a "Larson Giant Loop" and "Harley Quinn Spinsanity", a Tilt-A-Whirl.

**Answer chunks:** 4 labelled:

<details><summary>chunk #27 (search rank 1)</summary>

```text
The Joker:
Chaos Coaster 2015 Larson SuperLoop Gotham City A Larson fireball ride.
Justice League:
Battle for
Metropolis
2017 Sally Corporation Dark Ride Metropolis
Park A 3D shooting dark ride.
Pandemonium 2019 Zamperla Giant Discovery ScreamPunk
District A Zamperla Giant Discovery ride.
Ride Name Year
Opened Manufacturer/Ride Type Current
Location
Tweety's Tweehouse 2001 Zamperla Jumpin’ Star – kiddie drop tower. Originally known as
Tweety's Clubhouse until 2015.
Bugs Bunny
Boomtown
```

</details>

<details><summary>chunk #60 (search rank 2)</summary>

```text
2015: Improvements to Gotham City, including a pair of flat rides: "The Joker: Chaos Coaster", a
Larson Giant Loop; and "Harley Quinn Spinsanity", a Tilt-A-Whirl.[9]
2016: Bugs Bunny World re-themed into Bugs Bunny Boomtown. DC Super Friends area added
adjacent to Boomtown. Combined 12 new and re-themed attractions. Toro Toro, Swing Seville and
Little Aviator removed.[21] Ninja repainted blue and gray and renamed Blue Hawk in June 2016.
```

</details>

<details><summary>chunk #9 (search rank 3)</summary>

```text
City section. The first, "The Joker: Chaos Coaster" is a Larson Giant Loop ride approximately 70 feet in height,
while the second, "Harley Quinn Spinsanity", is a more traditional Tilt-A-Whirl family ride.[9] Both attractions
are part of a broader renovation of Gotham City, which will also include a new character meet-and-greet area
and improvements to the existing Gotham City Eatery restaurant.[9]
In 2016, Six Flags added two new children areas to the park – "Bugs Bunny Boomtown" and "DC Super
```

</details>

<details><summary>chunk #26 (search rank 4)</summary>

```text
Plantation (1981–2008).
SkyScreamer 2013 Funtime StarFlyer Lickskillet Park's tallest ride standing at 242-
foot (74 m) tall.
Harley Quinn
Spinsanity 2015 Tilt-A-Whirl Gotham City A modern twist on a classic tilt a
whirl
Other rides and attractions
```

</details>

**Model answer, top 10:**

> In 2015, Gotham City included "The Joker: Chaos Coaster," which is a Larson Giant Loop ride, and "Harley Quinn Spinsanity," which is a Tilt-A-Whirl family ride.

Your grade (top 10): ____

**Model answer, top 15:**

> In 2015, Gotham City included "The Joker: Chaos Coaster," which is a Larson Giant Loop ride, and "Harley Quinn Spinsanity," which is a Tilt-A-Whirl family ride.

Your grade (top 15): ____

---

## 27. `nq-0231` (nq, Italy national rugby union team)

**Question:** when was the last time italy won a game in the 6 nations

**Reference answer:** 19 November 2016

**Answer chunks:** 4 labelled:

<details><summary>chunk #35 (not in search top 20)</summary>

```text
by defeating South Africa 20-18 which was Italy's first win against the Springboks in 13 attempts at Stadio Artemio
Franchi in Florence.[29] This victory also marked their first win over one of the 3 big Southern Hemisphere nations
(Australia, New Zealand, South Africa).
Date Home Score Away Place
24 October 1978 Italy 19 - 6 Argentina Stadio Mario Battaglini, Rovigo
6 May 1995 Italy 22 - 12 Ireland Stadio Comunale di Monigo, Treviso
```

</details>

<details><summary>chunk #36 (not in search top 20)</summary>

```text
4 June 1995 Argentina 25 - 31 Italy Buffalo City Stadium, East London, South Africa
4 January 1997 Ireland 29 - 37 Italy Lansdowne Road, Dublin
22 March 1997 France 32 - 40 Italy Stade Lesdiguières, Grenoble
20 December 1997 Italy 37 - 22 Ireland Stadio Renato Dall'Ara, Bologna
24 January 1998 Italy 25 - 21 Scotland Stadio Comunale Monigo, Treviso
7 November 1998 Italy 23 - 19 Argentina Stadio Comunale Beltrametti, Piacenza
5 February 2000 Italy 34 - 20 Scotland Stadio Flaminio, Rome
```

</details>

<details><summary>chunk #37 (not in search top 20)</summary>

```text
15 February 2003 Italy 30 - 22 Wales Stadio Flaminio, Rome
6 March 2004 Italy 20 - 14 Scotland Stadio Flaminio, Rome
11 June 2005 Argentina 29 - 30 Italy Estadio Olímpico, Córdoba
24 February 2007 Scotland 17 - 37 Italy Murrayfield, Edinburgh
10 March 2007 Italy 23 - 20 Wales Stadio Flaminio, Rome
15 March 2008 Italy 23 - 20 Scotland Stadio Flaminio, Rome
28 June 2008 Argentina 12 - 13 Italy Estadio Olímpico, Córdoba
27 February 2010 Italy 16 - 12 Scotland Stadio Flaminio, Rome
```

</details>

<details><summary>chunk #38 (not in search top 20)</summary>

```text
12 March 2011 Italy 22 - 21 France Stadio Flaminio, Rome
17 March 2012 Italy 13 - 6 Scotland Stadio Olimpico, Rome
3 February 2013 Italy 23 - 18 France Stadio Olimpico, Rome
16 March 2013 Italy 22 - 15 Ireland Stadio Olimpico, Rome
28 February 2015 Scotland 19 - 22 Italy BT Murrayfield, Edinburgh
19 November 2016 Italy 20 - 18 South Africa Stadio Artemio Franchi, Florence
[30][31][32][33][34][35]
```

</details>

**Model answer, top 10:**

> The last time Italy won a game in the Six Nations was in 2015, when they scored their second away win versus Scotland.

Your grade (top 10): ____

**Model answer, top 15:**

> The last time Italy won a game in the Six Nations was in 2015.

Your grade (top 15): ____

---

## 28. `tat-0683` (tat, george-weston-limited_2019)

**Question:** What is the average Distributions from Choice Properties for quarters ended in 2019 and 2018?

**Reference answer:** 62.5

**Answer chunks:** 2 labelled:

<details><summary>chunk #54 (search rank 3)</summary>

```text
taxes paid. Lease payments are excluded from the calculation of GWL Corporate free cash flow(1)
to normalize for the impact of the implementation of IFRS 16.
For the quarters and years ended December 31
($ millions)
Quarters ended Years ended
2019 2018 2019 2018
Weston Foods adjusted EBITDA(1) 56 59 223 233
Weston Foods capital expenditures (70) (91) (194) (212)
Distributions from Choice Properties 82 43 325 43
Dividends from Loblaw – – 233 212
Weston Foods income taxes paid – (2) (7) (32)
```

</details>

<details><summary>chunk #1211 (not in search top 20)</summary>

```text
The following is a summary of Loblaw’s stock option plan activity:
2019 2018
Options
(number
of shares)
Weighted
Average
Exercise
Price/Share
Options
(number
of shares)
Weighted
Average
Exercise
Price/Share
Outstanding options, beginning of year 7,509,631 $ 51.60 7,487,774 $ 53.77
Granted (i) 1,552,458 $ 65.66 9,672,806 $ 53.26
Exercised (ii) (2,345,820) $ 43.82 (2,081,235) $ 38.87
Forfeited/cancelled (i) (398,347) $ 57.88 (7,569,714) $ 59.36
```

</details>

**Model answer, top 10:**

> The Distributions from Choice Properties for the quarters ended in 2019 is 82 and for the quarters ended in 2018 is 43.

Your grade (top 10): ____

**Model answer, top 15:**

> The Distributions from Choice Properties for the quarters ended in 2019 is 82 and for the quarters ended in 2018 is 43.

Your grade (top 15): ____

---

## 29. `feta-0606` (feta, Waiting to Exhale (soundtrack))

**Question:** Which award did waiting to exhale get and at which award show in 1996?

**Reference answer:** Waiting to Exhale's single earned Platinum award by the RIAA on May 23, 1996.

**Answer chunks:** 9 labelled, showing the 5 search ranked highest:

<details><summary>chunk #52 (search rank 3)</summary>

```text
Year Nominee / work Award Result
1996 "Exhale (Shoop Shoop)" (by Whitney
Houston) Best R&B/Soul Single, Female[106][107] Won
Recording Industry Association of America (RIAA) Awards
Soul Train Lady of Soul Awards
Soul Train Music Awards
```

</details>

<details><summary>chunk #49 (search rank 5)</summary>

```text
Year Date Title Format(s) Award description(s) Result(s)
1996
January 3
"Exhale (Shoop Shoop)" Single Gold[38] Won
"Exhale (Shoop Shoop)" Single Platinum[38] Won
January 16
Waiting to Exhale Original
Soundtrack Album Album Gold[102] Won
Waiting to Exhale Original
Soundtrack Album Album Platinum[14] Won
Waiting to Exhale Original
Soundtrack Album Album 4× Mult-Platinum[14] Won
February 14 "Sittin' Up in My Room" Single Gold[43] Won
March 12 "Not Gon' Cry" Single Gold[46] Won
```

</details>

<details><summary>chunk #51 (search rank 6)</summary>

```text
Flow" Single Platinum[61] Won
September
4
Waiting to Exhale Original
Soundtrack Album Album 7× Mult-Platinum[14] Won
Year Nominee / work Award Result
1996
"Not Gon' Cry" Best R&B/Soul Single— Solo (Mary J. Blige)[103][104] Won
"Exhale (Shoop
Shoop)" Best R&B/Soul Single—Solo (Whitney Houston)[103] Nominated
"Count on Me" R&B/Soul Composer of the Year (written by Whitney Houston, Kenneth
Edmonds and Michael Houston)[105] Nominated
Year Nominee / work Award Result
```

</details>

<details><summary>chunk #41 (search rank 8)</summary>

```text
Year Nominee /
work Award Result
1997 "Count on Me" Most Performed Songs, Motion Pictures (Whitney Houston, Michael
Houston)[90][91] Won
Year Nominee / work Award Result
1997 "Count on Me" ASCAP Pop Award (Whitney Houston, Michael Houston)[92] Won
Year Nominee / work Award Result
1996 "You're Makin' Me High"/"Let It Flow" R&B Single of the Year[59] Won
Year Nominee / work Award Result
1997
Kenneth "Babyface" Edmonds The Songwriter of the Year[93] Won
```

</details>

<details><summary>chunk #20 (not in search top 20)</summary>

```text
1995-1996 and was certified Platinum by the RIAA on January 3, 1996.[36][37][38]
The album's second single, "Sittin' Up in My Room" by Brandy, debuted at number forty-six and number
thirteen, on the Hot 100 Singles chart and Hot R&B Singles chart, the issue date of December 30, 1995,
respectively.[35][39] The single reached the number two on the Hot R&B Singles chart, the issue of February 17,
```

</details>

**Model answer, top 10:**

> Waiting to Exhale Original Soundtrack Album won the Outstanding Soundtrack Album at the NAACP Image Awards in 1996.

Your grade (top 10): ____

**Model answer, top 15:**

> The Waiting to Exhale soundtrack won several awards in 1996, including Outstanding Soundtrack Album and Outstanding Album at the NAACP Image Awards. It also won Best-selling Soundtrack Recording at the NARM Best Seller Awards. Additionally, it won at the MTV Movie Awards and the BMI Pop Awards.

Your grade (top 15): ____

---

## 30. `nq-0352` (nq, Taylor Schilling)

**Question:** who plays piper orange is the new black

**Reference answer:** Taylor Schilling (

**Answer chunks:** 4 labelled:

<details><summary>chunk #0 (search rank 2)</summary>

```text
Taylor Schilling
Schilling at PaleyFest 2014,
representing Orange Is the New
Black
Born July 27, 1984
Boston,
Massachusetts, U.S.
Education Fordham University
Occupation Actress
Years active 2007–present
Taylor Schilling
Taylor Schilling (born July 27, 1984) is an American actress. She is
known for her role as Piper Chapman on the Netflix original comedy-
drama series Orange Is the New Black (2013–present), for which she
received a nomination for the Primetime Emmy Award for Outstanding
```

</details>

<details><summary>chunk #11 (search rank 6)</summary>

```text
or Comedy
Orange Is the New
Black
Won
Best Cast – Television Series Won
Webby Awards Best Actress Won
2014
Golden Globe Awards Best Actress – Television Series Drama Nominated
Primetime Emmy
Awards
Outstanding Lead Actress in a Comedy
Series Nominated
2015
Golden Globe Awards Best Actress – Television Series Musical
or Comedy Nominated
Satellite Awards Best Actress – Television Series Musical
or Comedy Nominated
Screen Actors Guild
Awards
Outstanding Performance by an
```

</details>

<details><summary>chunk #1 (search rank 10)</summary>

```text
Lead Actress in a Comedy Series and two Golden Globe Award
nominations for Best Actress – Television Series Musical or Comedy
and Best Actress – Television Series Drama. She made her film debut in
the 2007 drama Dark Matter. Schilling also starred in the short-lived
NBC medical drama Mercy (2009–10). Her other films include Atlas
Shrugged: Part I (2011), the romantic drama The Lucky One (2012), the
comedy Take Me (2017) and the science fiction thriller The Titan (2018).
```

</details>

<details><summary>chunk #7 (search rank 17)</summary>

```text
Women's Prison. The show premiered on July 11, 2013.[10] For her work on the show, Schilling was nominated
for the Golden Globe Award for Best Actress in a Television Series – Drama[11] and the Primetime Emmy
Award for Outstanding Lead Actress in a Comedy Series in 2014.[12]
Regarding her sexuality, Schilling stated: "I’ve had very serious relationships with lots of people, and I’m a very
```

</details>

**Model answer, top 10:**

> Taylor Schilling plays Piper Chapman in Orange Is the New Black.

Your grade (top 10): ____

**Model answer, top 15:**

> Taylor Schilling plays Piper Chapman in Orange Is the New Black.

Your grade (top 15): ____

---

## 31. `tat-0745` (tat, overseas-shipholding-group-inc_2019)

**Question:** What was the Prepaid expenditures in 2019 and 2018 respectively?

**Reference answer:** ['5,621', '7,108']

**Answer chunks:** 1 labelled:

<details><summary>chunk #689 (search rank 2)</summary>

```text
The significant components of the Company’s deferred tax liabilities and assets follow:
December 31,
2019 2018
Deferred tax liabilities:
Vessels and other property (1) $ 128,026 $ 128,226
Prepaid expenditures 5,621 7,108
Operating lease right-of-use assets 72,298 —
Other-net 2 4
Total deferred tax liabilities 205,947 135,338
Deferred tax assets:
Loss carryforwards 68,917 66,737
Operating lease liability 71,779 —
Finance lease liability 6,333 —
Employee compensation and benefit plans 3,869 4,287
```

</details>

**Model answer, top 10:**

> Prepaid expenditures in 2019 were $5,621 and in 2018 were $7,108.

Your grade (top 10): ____

**Model answer, top 15:**

> Prepaid expenditures in 2019 was $5,621 and in 2018 was $7,108.

Your grade (top 15): ____

---

## 32. `feta-0389` (feta, Adam Pascal)

**Question:** What roles and shows did Adam Pascal perform with in 2003, 2004, and 2005?

**Reference answer:** Adam Pascal performed in Chess in 2003, playing Freddie Trumper, Hair in 2004 singing "I Got Life", and the 24 Hour Plays in 2005.

**Answer chunks:** 3 labelled:

<details><summary>chunk #6 (search rank 1)</summary>

```text
He also participated in several charity performances, including Chess in 2003 (playing the American, Freddie
Trumper),[9] Hair in 2004 (singing "I Got Life"),[10] and the 24 Hour Plays in 2005.[11] He returned to Aida in
2004 to close the run of the show as Radames.[12][13]
Along with original Broadway Rent cast member Anthony Rapp (Mark Cohen), Pascal returned to Broadway to
star as Roger in Rent from July 30 to October 7, 2007.[14] In January 2009, he and Rapp reprised their
```

</details>

<details><summary>chunk #22 (search rank 10)</summary>

```text
The New Standards (with Larry Edoff) – 2015
Year(s) Production Role Location Category
1996–
97 Rent Roger Davis Nederlander Theatre Broadway
1998 Shaftesbury Theatre West End
2000–
03 Aida Radames Palace Theatre Broadway
2003 Fully Committed — Lyceum Theatre Off-Broadway (co-
producer)
2003 Chess Freddie Trumper New Amsterdam
Theatre Concert
2003–
04 Cabaret The Emcee (Closing
Cast) Studio 54 Broadway
2004
Aida Radames (Closing Cast) Palace Theatre Broadway
Hair — New Amsterdam
Theatre
```

</details>

<details><summary>chunk #23 (not in search top 20)</summary>

```text
Hair — New Amsterdam
Theatre
Concert (sung "I Got
Life")
2005 The 24 Hour Plays — American Airlines
Theatre Benefit
2007 Rent Roger Davis
(Replacement) Nederlander Theatre Broadway
2008
Alive in the World — Zipper Theatre Benefit
Chess Freddie Trumper Royal Albert Hall Concert
Drift — B.B. King Blues Club Concert
2009–
10 Rent Roger Davis — US National Tour
2011 The Real Love: A New
Musical Rolf Pasadena Civic
Auditorium Concert
2011–
12 Memphis Huey Calhoun Shubert Theatre Broadway
```

</details>

**Model answer, top 10:**

> In 2003, Adam Pascal performed as Theo in the film "School of Rock." In 2004, he performed as Nicholi in the film "Temptation." In 2005, he performed as Roger Davis in the film "Rent."

Your grade (top 10): ____

**Model answer, top 15:**

> In 2003, Adam Pascal performed as Theo in the film "School of Rock." In 2004, he performed as Nicholi in the film "Temptation." In 2005, he performed as Roger Davis in the film version of "Rent."

Your grade (top 15): ____

---

## 33. `financebench-0146` (financebench, VERIZON_2022_10K)

**Question:** Has Verizon increased its debt on balance sheet between 2022 and the 2021 fiscal period?

**Reference answer:** No. Verizon's debt decreased by $229 million.

**Answer chunks:** 5 labelled:

<details><summary>chunk #809 (search rank 1)</summary>

```text
Note 7. Debt
Outstanding long-term debt obligations as of December 31, 2022 and 2021 are as follows:
(dollars in millions)
At December 31, Maturities Interest
Rates % 2022 2021
Verizon Communications < 5 Years 0.75 - 5.82 $ 23,929 $ 18,406
5-10 Years 1.50 - 7.88 42,637 43,225
> 10 Years 1.13 - 8.95 60,134 73,520
< 5 Years Floating (1) 2,992 4,086
5-10 Years Floating (1) 3,029 824
Alltel Corporation 5-10 Years 6.80 - 7.88 94 38
> 10 Years N/A N/A 58
```

</details>

<details><summary>chunk #588 (not in search top 20)</summary>

```text
Property, plant and equipment 307,689 289,897
Less Accumulated depreciation 200,255 190,201
Property, plant and equipment, net 107,434 99,696
Investments in unconsolidated businesses 1,071 1,061
Wireless licenses 149,796 147,619
Goodwill 28,671 28,603
Other intangible assets, net 11,461 11,677
Operating lease right-of-use assets 26,130 27,883
Other assets 17,260 13,329
Total assets $ 379,680 $ 366,596
Liabilities and Equity
Current liabilities
Debt maturing within one year $ 9,963 $ 7,443
```

</details>

<details><summary>chunk #589 (not in search top 20)</summary>

```text
Debt maturing within one year $ 9,963 $ 7,443
Accounts payable and accrued liabilities 23,977 24,833
Current operating lease liabilities 4,134 3,859
Other current liabilities 12,097 11,025
Total current liabilities 50,171 47,160
Long-term debt 140,676 143,425
Employee benefit obligations 12,974 15,410
Deferred income taxes 43,441 40,685
Non-current operating lease liabilities 21,558 23,203
Other liabilities 18,397 13,513
Total long-term liabilities 237,046 236,236
```

</details>

<details><summary>chunk #810 (not in search top 20)</summary>

```text
> 10 Years N/A N/A 58
Operating telephone company subsidiaries—debentures < 5 Years N/A N/A 141
5-10 Years 6.00 - 8.75 475 375
> 10 Years 5.13 - 7.38 139 250
Other subsidiaries—asset-backed debt < 5 Years 0.41 - 5.72 9,767 9,620
< 5 Years Floating (2) 10,271 4,610
Finance lease obligations (average rate of 2.5% and 2.2% in
2022 and 2021, respectively) 1,732 1,325
Unamortized discount, net of premium (4,039) (4,922)
Unamortized debt issuance costs (671) (688)
```

</details>

<details><summary>chunk #811 (not in search top 20)</summary>

```text
Unamortized debt issuance costs (671) (688)
Total long-term debt, including current maturities 150,489 150,868
Less long-term debt maturing within one year 9,813 7,443
Total long-term debt $ 140,676 $ 143,425
Long-term debt maturing within one year $ 9,813 $ 7,443
Add commercial paper 150 —
Debt maturing within one year 9,963 7,443
Add long-term debt 140,676 143,425
Total debt $ 150,639 $ 150,868
```

</details>

**Model answer, top 10:**

> Verizon's total debt was $150.9 billion as of December 31, 2021, and as of December 31, 2022, Verizon had approximately $130.6 billion of outstanding unsecured indebtedness, $9.4 billion of unused borrowing capacity under our existing revolving credit facility and $20.0 billion of outstanding secured indebtedness. Therefore, Verizon decreased its debt on the balance sheet between the 2021 and 2022 fiscal periods.

Your grade (top 10): ____

**Model answer, top 15:**

> Verizon's total debt was $150.9 billion as of December 31, 2021, and as of December 31, 2022, Verizon had approximately $130.6 billion of outstanding unsecured indebtedness, $9.4 billion of unused borrowing capacity under our existing revolving credit facility and $20.0 billion of outstanding secured indebtedness. Therefore, Verizon decreased its debt on the balance sheet between the 2022 and 2021 fiscal periods.

Your grade (top 15): ____

---

## 34. `nq-0222` (nq, Harry Potter and the Cursed Child)

**Question:** when will harry potter the cursed child come out

**Reference answer:** 22 April 2018 at

**Answer chunks:** 2 labelled:

<details><summary>chunk #1 (search rank 4)</summary>

```text
heplay.com/)
Harry Potter and the Cursed Child
Harry Potter and the Cursed Child is a two-part stage play written by
Jack Thorne based on an original story by Thorne, J. K. Rowling and
John Tiffany.[1] Previews of the play began at the Palace Theatre,
London on 7 June 2016,[2] and it premiered on 30 July 2016.
The play opened on Broadway on 22 April 2018 at the Lyric Theatre,
with previews starting on 16 March 2018. Its cast is similar to that of the
```

</details>

<details><summary>chunk #2 (not in search top 20)</summary>

```text
first year on West End, with returning actors Anthony Boyle, Sam
Clemmett, Noma Dumezweni, Poppy Miller, Jamie Parker, Alex Price,
and Paul Thornley.
The story begins nineteen years after the events of Harry Potter and the
Deathly Hallows and follows Harry Potter, now a Ministry of Magic
employee, and his younger son Albus Severus Potter, who is about to
attend Hogwarts School of Witchcraft and Wizardry.
At the 2017 Laurence Olivier Awards, the London production received a
```

</details>

**Model answer, top 10:**

> "Harry Potter and the Cursed Child" premiered on 30 July 2016 at the Palace Theatre, London. It opened on Broadway on 22 April 2018 at the Lyric Theatre.

Your grade (top 10): ____

**Model answer, top 15:**

> Harry Potter and the Cursed Child premiered on 30 July 2016 at the Palace Theatre, London. It opened on Broadway on 22 April 2018 at the Lyric Theatre.

Your grade (top 15): ____

---

## 35. `nq-0214` (nq, Femina Miss India)

**Question:** who was the first indian woman to be crowned miss universe

**Reference answer:** Sushmita Sen won

**Answer chunks:** 2 labelled:

<details><summary>chunk #21 (search rank 2)</summary>

```text
In 1970, Zeenat Aman won Miss Asia Pacific 1970. She became the first
Indian and South Asian woman to win the title.[26]
The awards for 1989 were given at the end of the year (December);
hence there was no separate contest for 1990.
In 1994, Sushmita Sen won the Miss Universe title after winning the
Miss India crown and became the first Indian woman ever to win the
Miss Universe crown.[27] The same year the runner-up of Miss India, Aishwarya Rai, won the Miss World
```

</details>

<details><summary>chunk #22 (search rank 16)</summary>

```text
title.[28] Sushmita Sen and Aishwarya Rai established themselves in the Bollywood industry after winning their
titles.[29][30][31]
The success of Rai and Sen spawned coaching institutions which were set up to groom young women in pageant
participation skills. The number of participants in the preliminary rounds of the pageant has increased
considerably. Miss India World 1997, Diana Hayden won the title of Miss World 1997. In 1999, the Miss India
```

</details>

**Model answer, top 10:**

> The first Indian woman to be crowned Miss Universe was Sushmita Sen. She won the Miss Universe title in 1994 after winning the Miss India crown.

Your grade (top 10): ____

**Model answer, top 15:**

> The first Indian woman to be crowned Miss Universe was Indrani Rehman. She was crowned Miss India 1952 and represented India at Miss Universe 1952, the inaugural edition of the Miss Universe pageant.

Your grade (top 15): ____

---

## 36. `feta-0493` (feta, Lesley-Ann Brandt)

**Question:** Which roles did Brandt play in 2011?

**Reference answer:** In 2011, Lesley-Ann Brandt appeared in A Beautiful Soul as Angela Barry.

**Answer chunks:** 1 labelled:

<details><summary>chunk #12 (search rank 9)</summary>

```text
Things We Carry"
2011 Duke Violet
2011 Zombie
Apocalypse Cassie TV film
2012 A Beautiful Soul Angela Barry
2013 Drift Lani
2014 The Librarians Lamia Recurring role, 5
episodes
2014 Single Ladies Naomi Cox Recurring role, 11
episodes
2014 Gotham Larissa
Diaz/Copperhead Episode: "Lovecraft"
2015 Painkillers Guts
2019 Heartlock Tara Sharpe
Filmography
```

</details>

**Model answer, top 10:**

> In 2011, Lesley-Ann Brandt played the following roles: Fatima Tazi in "Chuck," Naevia in "Spartacus: Gods of the Arena," Camille Jordanson in "CSI: NY," Valerie Khoury in "InSight," Adriana in "Memphis Beat," Violet in "Duke," and Cassie in "Zombie Apocalypse."

Your grade (top 10): ____

**Model answer, top 15:**

> In 2011, Lesley-Ann Brandt played the following roles: Fatima Tazi in "Chuck," Naevia in "Spartacus: Gods of the Arena," Camille Jordanson in "CSI: NY," Valerie Khoury in "InSight," Adriana in "Memphis Beat," Violet in "Duke," Cassie in "Zombie Apocalypse," and Angela Barry in "A Beautiful Soul."

Your grade (top 15): ____

---

## 37. `tat-0647` (tat, clearfield-inc_2019)

**Question:** What is the model used to determine the weighted average fair value of options granted?

**Reference answer:** ['Black-Scholes option pricing model']

**Answer chunks:** 1 labelled:

<details><summary>chunk #336 (search rank 2)</summary>

```text
Stock Options: The Company uses the Black-Scholes option pricing model to determine the weighted average fair value of options granted. During the fiscal year ended
September 30, 2019, the Company granted employees non-qualified stock options to purchase an aggregate of 172,000 shares of common stock with a weighted average
contractual term of 4 years, a three year vesting term, and a weighted average exercise price of $12.17. During the fiscal year ended September 30, 2018, the Company
```

</details>

**Model answer, top 10:**

> The model used to determine the weighted average fair value of options granted is the Black-Scholes option pricing model.

Your grade (top 10): ____

**Model answer, top 15:**

> The Black-Scholes option pricing model is used to determine the weighted average fair value of options granted.

Your grade (top 15): ____

---

## 38. `feta-0550` (feta, Noomi Rapace)

**Question:** What performance did Noomi Rapace receive a nomination for a BAFTA Award?

**Reference answer:** In 2011, Noomi Rapace was nominated for a BAFTA Award for Best Actress for her performance in The Girl with the Dragon Tattoo.

**Answer chunks:** 3 labelled:

<details><summary>chunk #1 (search rank 5)</summary>

```text
Dragon Tattoo, The Girl Who Played with Fire, and The Girl
Who Kicked the Hornets' Nest.[3] In 2011, she was nominated
for a BAFTA Award for Best Actress for her performance in
The Girl with the Dragon Tattoo.
She is also known for playing Anna in Daisy Diamond
(2007), Leena in Beyond (2010), Anna in The Monitor (2011),
Madame Simza Heron in Sherlock Holmes: A Game of
Shadows (2011), the lead role of Dr. Elizabeth Shaw in the
Ridley Scott science-fiction film Prometheus (2012), Beatrice
```

</details>

<details><summary>chunk #24 (search rank 7)</summary>

```text
The Girl with the Dragon
Tattoo
Nominated
Empire Awards Best Actress Won
BAFTA Awards Best Leading Actress Nominated
Academy of Science
Fiction, Fantasy & Horror
Films
Best Actress Nominated
Broadcast Film Critics
Association Awards Best Actress Nominated
Central Ohio Film Critics
Association Breakthrough Film Artist
The Girl Who Played with
Fire
The Girl Who Kicked the
Hornet's Nest
The Girl with the Dragon
Tattoo
Nominated
Guldbagge Awards Best Actress Beyond Nominated
International Emmy
```

</details>

<details><summary>chunk #23 (search rank 10)</summary>

```text
Society Award Best Lead Actress Nominated
New York Film Critics
Online Award Breakthrough Performer Won
Satellite Awards Best Actress – Motion
Picture Drama Won
St. Louis Gateway Film
Critics Association Best Actress Nominated
Saturn Award Best Actress The Girl with the Dragon
Tattoo Nominated
São Paulo International
Film Festival Best Actress Beyond Won
Hollywood Film Festival Spotlight Award Won
2011
London Film Critics'
Circle Actress of the Year
The Girl with the Dragon
Tattoo
Nominated
```

</details>

**Model answer, top 10:**

> Noomi Rapace received a nomination for a BAFTA Award for her performance in "The Girl with the Dragon Tattoo."

Your grade (top 10): ____

**Model answer, top 15:**

> Noomi Rapace received a nomination for a BAFTA Award for her performance in "The Girl with the Dragon Tattoo."

Your grade (top 15): ____

---

## 39. `feta-0437` (feta, Ford Fusion (Americas))

**Question:** What is the power efficiency of the 3.0L Duratec and I4 engines?

**Reference answer:** The 3.0 L Duratec provided 240 hp (179 kW) with E85 fuel capability, while the I4 provided 175 hp (130 kW).

**Answer chunks:** 1 labelled:

<details><summary>chunk #27 (search rank 9)</summary>

```text
combined (automatic); 22/30/25
(selectshift, SE/SEL trims); 22/32/25
(manual, S trim); 22/29/24 (manual,
SE trim)[30]
8.0 sec
3.0 L
Duratec
30 V6
182 CID 240 hp
(179 kW)
223 lb⋅ft
(302 N⋅m)
20/28/23 FWD; 18/26/20 AWD,
gasoline/E85 flex fuel 7.4 sec
3.5 L
Duratec
35 V6
213 CID 263 hp
(196 kW)
249 lb⋅ft
(338 N⋅m)
(Fusion Sport); 18/27/21 FWD;
17/24/19 AWD 6.5 sec
2.5 L
Duratec
25 I4
152 CID
156 hp
(116 kW);
191 hp
(142 kW)
combined
136 lb⋅ft
(184 N⋅m)[31] (Hybrid) 41/36/39 7.8 sec
```

</details>

**Model answer, top 10:**

> The 3.0 L Duratec 30 V6 engine has a gas mileage of 20/28/23 FWD; 18/26/20 AWD, gasoline/E85 flex fuel. The 2.5 L Duratec 25 I4 engine has a gas mileage of 23 mpg city/33 mpg highway/26 mpg combined (automatic); 22/30/25 (selectshift, SE/SEL trims); 22/32/25 (manual, S trim); 22/29/24 (manual, SE trim).

Your grade (top 10): ____

**Model answer, top 15:**

> The 3.0 L Duratec 30 V6 engine has a power of 240 hp (179 kW) and a torque of 223 lb⋅ft (302 N⋅m), with a fuel economy of 20/28/23 mpg (FWD; gasoline/E85 flex fuel). The 2.5 L Duratec 25 I4 engine has a power of 175 hp (130 kW) and a torque of 172 lb⋅ft (233 N⋅m), with a fuel economy of 23 mpg city/33 mpg highway/26 mpg combined (automatic); 22/30/25 (selectshift, SE/SEL trims); 22/32/25 (manual, S trim); 22/29/24 (manual, SE trim).

Your grade (top 15): ____

---

## 40. `nq-0367` (nq, Troian Bellisario)

**Question:** who played alex drake on pretty little liars

**Reference answer:** Troian Avery Bellisario (

**Answer chunks:** 4 labelled:

<details><summary>chunk #1 (search rank 3)</summary>

```text
1985) is an American actress. She is known for playing the role of
Spencer Hastings in Freeform's Pretty Little Liars (2010-2017).
Born in Los Angeles, California, she is the daughter of producers
Donald P. Bellisario and Deborah Pratt. Bellisario made her acting
debut in her father's 1988 film Last Rites at the age of three. She
continued to have roles produced by her father, mainly in television
shows such as Quantum Leap, First Monday, and NCIS, and in
```

</details>

<details><summary>chunk #2 (search rank 4)</summary>

```text
1998, she acted in the direct-to-video comedy film Billboard Dad.
In 2010, she received praise for her leading performance in the film
Consent for which she won the Vision Fest Award for Best Acting
by a Female Lead and the FirstGlance Philadelphia Award for Best
Actress.
In 2009, Bellisario landed the lead role of Spencer Hastings in the
Freeform series Pretty Little Liars (2010–2017). For her
performance, she has won two Teen Choice Awards out of six
```

</details>

<details><summary>chunk #0 (not in search top 20)</summary>

```text
Troian Bellisario
Troian Bellisario in 2013
Born Troian Avery Bellisario
October 28, 1985
Los Angeles, California,
U.S.
Alma mater University of Southern
California
Occupation Actress
Years active 1985 -present
Spouse Patrick J. Adams (m. 2016)
Parent(s) Donald P. Bellisario
Deborah Pratt
Relatives Michael Bellisario (half-
brother) Sean Murray
(step-brother)
Troian Bellisario
Troian Avery Bellisario (/ˈtrɔɪən ˌbɛlɪˈsɑːrioʊ/; born October 28,
```

</details>

<details><summary>chunk #7 (not in search top 20)</summary>

```text
grade,[5] where she was the valedictorian of her class.[6] After high school, Bellisario attended Vassar College
for a couple months before taking a break for the sake of her mental health as she felt the institution only
enhanced her need for perfection.[7] She graduated with a Bachelor of Fine Arts degree from the University of
Southern California in 2009.[8]
Bellisario made her acting debut in the 1988 film Last Rites at the age of three.[9] From 1990 to 2007, she guest
```

</details>

**Model answer, top 10:**

> Troian Bellisario played Alex Drake on Pretty Little Liars.

Your grade (top 10): ____

**Model answer, top 15:**

> Troian Bellisario played Alex Drake on Pretty Little Liars.

Your grade (top 15): ____

---

## 41. `feta-0438` (feta, France at the Rugby World Cup)

**Question:** Which cities in France hosted the 2007 Rugby World Cup games?

**Reference answer:** French cities that hosted the Rugby World Cup games include Bordeaux, Lens, Lyon, Marseilles, Montpellier, Nantes, St. Etienne, Toulouse and Paris, as well as Saint-Denis at the Stade de France.

**Answer chunks:** 1 labelled:

<details><summary>chunk #43 (search rank 3)</summary>

```text
Lens, Lyon, Marseilles, Montpellier, Nantes, St. Etienne, Toulouse and Paris, and it was also announced that the
final would be at the Stade de France in Saint-Denis.[1]
1999 Rugby World Cup
2007 Rugby World Cup
```

</details>

**Model answer, top 10:**

> The cities in France that hosted the 2007 Rugby World Cup games are Saint-Denis, Marseille, Paris, Lens, Lyon, Nantes, Toulouse, Saint-Étienne, and Bordeaux.

Your grade (top 10): ____

**Model answer, top 15:**

> The cities in France that hosted the 2007 Rugby World Cup games are Bordeaux, Lens, Lyon, Marseille, Montpellier, Nantes, Saint-Étienne, Toulouse, and Paris. The final was held at the Stade de France in Saint-Denis.

Your grade (top 15): ____

---

## 42. `feta-0426` (feta, El Clásico)

**Question:** How does Barcelona compare to Real Madrid in terms of total matches and wins ?

**Reference answer:** In El Clásico, Barcelona leads the head-to-head results in competitive matches with 96 wins to Real Madrid's 95; Barcelona also leads in total matches with 115 wins to Real Madrid's 99 as of match played on 2 March 2019.

**Answer chunks:** 2 labelled:

<details><summary>chunk #4 (search rank 1)</summary>

```text
in 2014 Forbes ranked Barcelona and Real Madrid the
world's two most valuable sports teams.[3] Both clubs have
a global fanbase; they are the world's two most followed
sports teams on social media.[12][13]
Barcelona leads the head-to-head results in competitive
matches with 96 wins to Real Madrid's 95; Barcelona also
leads in total matches with 115 wins to Real Madrid's 99 as
This is an old revision of this page, as edited by Snowflake91 (talk | contribs) at 20:45, 27 April
```

</details>

<details><summary>chunk #47 (search rank 6)</summary>

```text
On 2 March 2019, Barcelona overtook Real Madrid in El Clásico victories in competitive matches after winning
an away game 1–0.[69][70]
As of 2 March 2019
Matches
Wins
Draws
RMA BAR
La Liga 178 72 72 34
Copa del Rey 35 12 15 8
Copa de la Liga 6 0 2 4
Supercopa de España 14 8 4 2
Copa de la Coronación[a] 1 0 1 0
UEFA Champions League 8 3 2 3
All competitions 242 95 96 51
Exhibition game 33 4 19 10
All matches 275 99 115 61
```

</details>

**Model answer, top 10:**

> Barcelona has 115 total wins compared to Real Madrid's 99, in total matches between the two teams.

Your grade (top 10): ____

**Model answer, top 15:**

> Barcelona leads in total matches with 115 wins to Real Madrid's 99.

Your grade (top 15): ____

---

## 43. `nq-0269` (nq, List of Premier League winning players)

**Question:** how many games to get premier league medal

**Reference answer:** a minimum of five matches

**Answer chunks:** 2 labelled:

<details><summary>chunk #1 (search rank 1)</summary>

```text
sponsorship agreements.[2]
Since the 2012–13 season, a player needs to have played in a minimum of five
matches for a title-winning team to qualify for a medal.[3] This is down from the
previous standard of ten matches played.[4] At the discretion of the Premier
League board, additional medals can be awarded to players who played less than
five matches.[5] This special dispensation is usually reserved for back-up
goalkeepers and players who did not make the minimum number of appearances
```

</details>

<details><summary>chunk #2 (search rank 3)</summary>

```text
through injury.[6][7] For the first season, players received a miniature version of
the trophy rather than a medal.[8]
As of the end of the 2017–18 season, six clubs have won the title – Manchester
United, Blackburn Rovers, Arsenal, Chelsea, Manchester City and Leicester City –[9] with 508 medals awarded
to 262 players. Having won 13 Premier League championships, Manchester United have more title-winning
```

</details>

**Model answer, top 10:**

> To qualify for a Premier League medal, a player needs to have played in a minimum of five matches for a title-winning team.

Your grade (top 10): ____

**Model answer, top 15:**

> To qualify for a Premier League medal, a player needs to have played in a minimum of five matches for a title-winning team.

Your grade (top 15): ____

---

## 44. `feta-0472` (feta, Jennifer Saunders)

**Question:** Which film roles did Jennifer Saunders voice in 2015 and 2016?

**Reference answer:** In 2015, Saunders voiced Elizabeth II in the film Minions, and in 2016 she voiced Nana Noodleman in the film Sing.

**Answer chunks:** 2 labelled:

<details><summary>chunk #40 (search rank 1)</summary>

```text
Year Film Role Notes
1985 The Supergrass Lesley Reynolds
1987 Eat the Rich Lady Caroline
1995 In the Bleak Midwinter Nancy Crawford
1996 Muppet Treasure Island Mrs. Bluveridge
1997 Spice World Fashionable
Woman
2001 Absolument fabuleux Herself French adaptation of the series; cameo
appearance
2004 Shrek 2 Fairy Godmother Voice
2009 Coraline Miss April Spink Voice
2015 Minions Elizabeth II Voice
2016 Absolutely Fabulous: The Movie Edina Monsoon Also writer
Sing Nana Noodleman Voice
```

</details>

<details><summary>chunk #27 (search rank 2)</summary>

```text
fortnight,[4] and it proceeded to make $353 million in just three weeks in the U.S.[23]
Her role won the American People's Choice Award for the best movie villain in 2005.[24] She voiced Miss Spink
in the animated film Coraline, in which her comedy partner Dawn French voiced a character called Miss
Forcible. In 2015, she voiced Queen Elizabeth II in the animated film Minions,[25][26] and in 2016, she voiced
Miss Nana Noodleman in the animated film Sing.
```

</details>

**Model answer, top 10:**

> In 2015, Jennifer Saunders voiced Queen Elizabeth II in the animated film Minions. In 2016, she voiced Nana Noodleman in the animated film Sing.

Your grade (top 10): ____

**Model answer, top 15:**

> In 2015, Jennifer Saunders voiced Queen Elizabeth II in the animated film Minions. In 2016, she voiced Nana Noodleman in the animated film Sing.

Your grade (top 15): ____

---

## 45. `tat-0692` (tat, hc2-holdings-inc_2019)

**Question:** What is the change in the Cable-ships and submersibles from 2018 to 2019?

**Reference answer:** -4.6

**Answer chunks:** 2 labelled:

<details><summary>chunk #1691 (search rank 1)</summary>

```text
Cable-ships and submersibles $ 246.5 $ 251.1
Equipment, furniture and fixtures, and software 214.1 148.0
Building and leasehold improvements 48.9 47.3
Land 36.8 32.8
Construction in progress 14.3 12.9
Plant and transportation equipment 13.5 12.0
574.1 504.1
Less: Accumulated depreciation 168.3 127.8
Total $ 405.8 $ 376.3
Depreciation expense was $52.3 million and $46.6 million for the years ended December 31, 2019 and 2018, respectively. These amounts included $9.1 million and $7.0
```

</details>

<details><summary>chunk #1690 (search rank 7)</summary>

```text
reinsurance by $140.8 million and recognizing a gain of $20.6 million, included in Other income (expense), net. The second recapture received $168.0 million of cash,
reduced its ceded reinsurance by $141.7 million and recognizing a gain of $26.3 million, included in Other income.
10. Property, Plant and Equipment, net
Property, plant and equipment consists of the following (in millions):
December 31,
2019 2018
Cable-ships and submersibles $ 246.5 $ 251.1
```

</details>

**Model answer, top 10:**

> Cable-ships and submersibles decreased from $251.1 million in 2018 to $246.5 million in 2019.

Your grade (top 10): ____

**Model answer, top 15:**

> The value of Cable-ships and submersibles decreased from $251.1 million in 2018 to $246.5 million in 2019.

Your grade (top 15): ____

---

## 46. `feta-0462` (feta, Internet Explorer version history)

**Question:** Which windows editions was internet explorer 2 made for, released in 1995?

**Reference answer:** Internet Explorer 2 was released for Windows 95 and Windows NT 3.51 in 1995.

**Answer chunks:** 1 labelled:

<details><summary>chunk #11 (not in search top 20)</summary>

```text
Availability on desktop operating systems
Operating system Latest stable version Support status
Windows
7 and later, Server 2008 R2 and later 11.0.115 2009–
Vista, 2008 9.0.8112.16421 2006–2017
XP, 2003, 2003 R2 8.0.6001.18702 2001–2014
NT 4.0, 98, 2000, ME 6.0 SP1 1996–2010
95 5.5 SP2 1995–2001
3.1x, NT 3.51 5.0 SP2 1995–2001
NT 3.5 5.0 1995–2001
NT 3.1 5.0 1993–2000
macOS
10.4–10.6 (IA-32, x64) 5.2.3 (with Rosetta) 2005–2006
10.1–10.5 (PPC) 5.2.3 2001–2006
Classic Mac OS
```

</details>

**Model answer, top 10:**

> Microsoft Internet Explorer 2 was released for Windows 95, Windows NT 3.51, and NT 4.0.

Your grade (top 10): ____

**Model answer, top 15:**

> Microsoft Internet Explorer 2 was released for Windows 95, Windows NT 3.51, and NT 4.0.

Your grade (top 15): ____

---

## 47. `feta-0572` (feta, Rose McGowan)

**Question:** What awards did McGowan receive at the Wand Awards and the 2005 Family Television Awards?

**Reference answer:** At the Wand Awards, McGowan was nominated for Best New Cast Member and at the 2005 Family Television Awards she won for Favorite Sister.

**Answer chunks:** 2 labelled:

<details><summary>chunk #65 (search rank 1)</summary>

```text
Year Film / Title Award Category Result
1995 The Doom
Generation 11th Independent Spirit Awards Independent Spirit Award for
Best Debut Performance Nominated
1999 Jawbreaker MTV Movie Award MTV Movie Award for Best
Villain Nominated
2005 Charmed Family Television Awards Favorite Sister Won
2005 Charmed Wand Award Wand Award for Best New Cast
Member Nominated
2006 — Blender Sexiest Women Of TV And
Film Won[106]
2008 Grindhouse – Planet
Terror Saturn Award Best Supporting Actress Nominated[107]
```

</details>

<details><summary>chunk #15 (search rank 2)</summary>

```text
wrote that McGowan brought "a youthfulness" and "a fresh viewer perspective" to Charmed, further noting that
"fans have come to enjoy her presence on the show."[20] Sara Paige and Rachel Hyland of Geek Speak magazine
described Paige as "snarky, compassionate and whimsical", and believed that "McGowan was well-suited for the
role."[21] At the 2001 Wand Awards, McGowan was nominated for Best New Cast Member and at the 2005
Family Television Awards, she won Favorite Sister, for her performance.
```

</details>

**Model answer, top 10:**

> McGowan was nominated for Best New Cast Member at the 2001 Wand Awards and won Favorite Sister at the 2005 Family Television Awards.

Your grade (top 10): ____

**Model answer, top 15:**

> McGowan was nominated for Best New Cast Member at the 2001 Wand Awards and won Favorite Sister at the 2005 Family Television Awards.

Your grade (top 15): ____

---

## 48. `nq-0357` (nq, The Players Championship)

**Question:** who has won the players championship more than once

**Reference answer:** Jack Nicklaus:

**Answer chunks:** 2 labelled:

<details><summary>chunk #30 (search rank 1)</summary>

```text
Phil Mickelson with the 2007
Players Championship trophy
1975 Al
Geiberger
United
States 270 −10 3
strokes
Dave
Stockton 50,000 250,000
1974 Jack
Nicklaus
United
States 272 −16 2
strokes
J. C.
Snead 50,000 250,000
Note: Green highlight indicates scoring records.
Sources[21][22]
Six players have won the tournament more than once:
3 wins:
Jack Nicklaus: 1974, 1976, 1978
2 wins:
Fred Couples: 1984, 1996
Steve Elkington: 1991, 1997
Hal Sutton: 1983, 2000
Davis Love III: 1992, 2003
```

</details>

<details><summary>chunk #31 (search rank 6)</summary>

```text
Hal Sutton: 1983, 2000
Davis Love III: 1992, 2003
Tiger Woods: 2001, 2013
Nicklaus won in alternating years at three different venues, but never at the Stadium Course, where the rest won
both titles. The shortest span between wins at the Stadium Course is six years (Elkington) and the longest is
seventeen years (Sutton).
1974: Jack Nicklaus wins the inaugural edition of the
tournament. He beats J.C. Snead by two shots near
Atlanta.[23]
1977: Mark Hayes wins by two shots over Mike McCullough at
```

</details>

**Model answer, top 10:**

> Six players have won the tournament more than once:
> 3 wins:
> Jack Nicklaus: 1974, 1976, 1978
> 2 wins:
> Fred Couples: 1984, 1996
> Steve Elkington: 1991, 1997
> Hal Sutton: 1983, 2000
> Davis Love III: 1992, 2003
> Tiger Woods: 2001, 2013

Your grade (top 10): ____

**Model answer, top 15:**

> Six players have won the tournament more than once:
> 3 wins:
> Jack Nicklaus: 1974, 1976, 1978
> 2 wins:
> Fred Couples: 1984, 1996
> Steve Elkington: 1991, 1997
> Hal Sutton: 1983, 2000
> Davis Love III: 1992, 2003
> Tiger Woods: 2001, 2013

Your grade (top 15): ____

---

## 49. `tat-0753` (tat, plexus-corp_2019)

**Question:** Which years does the table provide information for its reportable segments?

**Reference answer:** ['2019', '2018', '2017']

**Answer chunks:** 151 labelled, showing the 5 search ranked highest:

<details><summary>chunk #367 (search rank 2)</summary>

```text
2018, and the related consolidated statements of comprehensive income, of shareholders’ equity, and of cash flows for each of the three years in the period ended
September 28, 2019, including the related notes and financial statement schedule listed in the accompanying index (collectively referred to as the “consolidated
financial statements”). We also have audited the Company's internal control over financial reporting as of September 28, 2019, based on criteria established in
```

</details>

<details><summary>chunk #254 (search rank 3)</summary>

```text
Table of Contents
A discussion of net sales by reportable segment is presented below for the indicated fiscal years (in millions):
2019 2018
Net sales:
AMER $ 1,429.3 $ 1,218.9
APAC 1,557.2 1,498.0
EMEA 309.9 281.5
Elimination of inter-segment sales (132.0) (124.9)
Total net sales $ 3,164.4 $ 2,873.5
AMER. Net sales for fiscal 2019 in the AMER segment increased $210.4 million, or 17.3%, as compared to fiscal 2018. The increase in net sales was driven by a
```

</details>

<details><summary>chunk #302 (search rank 9)</summary>

```text
reduction in inventory. As the guidance was adopted using a modified retrospective approach, no impact to prior periods was required to be recognized.
As of September 28, 2019, annualized cash cycle days increased seven days compared to September 29, 2018 due to the following factors:
Days in accounts receivable for the three months ended September 28, 2019 increased eight days compared to the three months ended September 29, 2018. The
```

</details>

<details><summary>chunk #567 (search rank 12)</summary>

```text
Information about the Company’s three reportable segments for fiscal 2019, 2018 and 2017 is as follows (in thousands):
2019 2018 2017
Net sales:
AMER $ 1,429,308 $ 1,218,944 $ 1,166,346
APAC 1,557,205 1,498,010 1,279,261
EMEA 309,933 281,489 192,829
Elimination of inter-segment sales (132,012) (124,935) (110,384)
$ 3,164,434 $ 2,873,508 $ 2,528,052
Operating income (loss):
AMER $ 57,780 $ 38,637 $ 41,924
APAC 208,178 213,935 200,103
EMEA 4,475 1,447 (6,197)
```

</details>

<details><summary>chunk #472 (search rank 15)</summary>

```text
In fiscal 2019, the Company adopted and applied Topic 606 to all contracts using the modified retrospective method of adoption. The prior year comparative
information has not been restated and continues to be reported under the accounting standards in effect for fiscal 2018. Refer to Note 15, "Revenue from Contracts
with Customers," for further information.
3. Property, Plant and Equipment
```

</details>

**Model answer, top 10:**

> The table provides information for the years 2019, 2018, and 2017.

Your grade (top 10): ____

**Model answer, top 15:**

> The table provides information for fiscal 2019, 2018, and 2017.

Your grade (top 15): ____

---

## 50. `nq-0350` (nq, Stone (unit))

**Question:** where does the weight measurement stone come from

**Reference answer:** the use of stones for weights,

**Answer chunks:** 2 labelled:

<details><summary>chunk #2 (search rank 1)</summary>

```text
and Measures Act of 1985.
The name "stone" derives from the use of stones for weights, a practice that dates
back into antiquity. The Biblical law against the carrying of "diverse weights, a
large and a small"[7] is more literally translated as "you shall not carry a stone
and a stone (ואבן אבן), a large and a small". There was no standardised "stone"
in the ancient Jewish world,[8] but in Roman times stone weights were crafted to
```

</details>

<details><summary>chunk #3 (search rank 8)</summary>

```text
multiples of the Roman pound.[9] Such weights varied in quality: the Yale
Medical Library holds 10 and 50-pound examples of polished serpentine,[10]
while a 40-pound example at the Eschborn Museum is made of sandstone.[11]
The English stone under law varied by commodity and in practice varied
according to local standards. The Assize of Weights and Measures, a statute of
uncertain date from c. 1300, describes stones of 5 merchants' pounds used for
```

</details>

**Model answer, top 10:**

> The stone as a weight measurement comes from the use of stones for weights, a practice that dates back into antiquity. The name "stone" derives from this practice.

Your grade (top 10): ____

**Model answer, top 15:**

> The stone as a weight measurement comes from the use of stones for weights, a practice that dates back into antiquity. The name "stone" derives from this practice.

Your grade (top 15): ____

---

## 51. `financebench-0068` (financebench, COCACOLA_2021_10K)

**Question:** What is Coca Cola's FY2021 COGS % margin? Calculate what was asked by utilizing the line items clearly shown in the income statement.

**Reference answer:** 39.7%

**Answer chunks:** 17 labelled, showing the 5 search ranked highest:

<details><summary>chunk #810 (search rank 1)</summary>

```text
THE COCA-COLA COMPANY AND SUBSIDIARIES
CONSOLIDATED STATEMENTS OF INCOME
(In millions except per share data)
Year Ended December 31, 2021 2020 2019
Net Operating Revenues $ 38,655 $ 33,014 $ 37,266
Cost of goods sold 15,357 13,433 14,619
Gross Profit 23,298 19,581 22,647
Selling, general and administrative expenses 12,144 9,731 12,103
Other operating charges 846 853 458
Operating Income 10,308 8,997 10,086
Interest income 276 370 563
Interest expense 1,597 1,437 946
```

</details>

<details><summary>chunk #819 (search rank 3)</summary>

```text
THE COCA-COLA COMPANY AND SUBSIDIARIES
CONSOLIDATED STATEMENTS OF CASH FLOWS
(In millions)
Year Ended December 31, 2021 2020 2019
Operating Activities
Consolidated net income $ 9,804 $ 7,768 $ 8,985
Depreciation and amortization 1,452 1,536 1,365
Stock-based compensation expense 337 126 201
Deferred income taxes 894 (18) (280)
Equity (income) loss — net of dividends (615) (511) (421)
Foreign currency adjustments 86 (88) 91
Significant (gains) losses — net (1,365) (914) (467)
```

</details>

<details><summary>chunk #813 (search rank 4)</summary>

```text
THE COCA-COLA COMPANY AND SUBSIDIARIES
CONSOLIDATED STATEMENTS OF COMPREHENSIVE INCOME
(In millions)
Year Ended December 31, 2021 2020 2019
Consolidated Net Income $ 9,804 $ 7,768 $ 8,985
Other Comprehensive Income:
Net foreign currency translation adjustments (699) (911) 74
Net gains (losses) on derivatives 214 15 (54)
Net change in unrealized gains (losses) on available-for-sale debt securities (90) (47) 18
Net change in pension and other postretirement benefit liabilities 712 (267) (159)
```

</details>

<details><summary>chunk #827 (search rank 5)</summary>

```text
Adoption of accounting standards 19 — 546
Net income attributable to shareowners of The Coca-Cola Company 9,771 7,747 8,920
Dividends (per share — $1.68, $1.64 and $1.60 in 2021, 2020 and 2019, respectively) (7,251) (7,047) (6,845)
Balance at end of year 69,094 66,555 65,855
Accumulated Other Comprehensive Income (Loss)
Balance at beginning of year (14,601) (13,544) (12,814)
Adoption of accounting standards — — (564)
Net other comprehensive income (loss) 271 (1,057) (166)
```

</details>

<details><summary>chunk #825 (search rank 7)</summary>

```text
THE COCA-COLA COMPANY AND SUBSIDIARIES
CONSOLIDATED STATEMENTS OF SHAREOWNERS’ EQUITY
(In millions except per share data)
Year Ended December 31, 2021 2020 2019
Equity Attributable to Shareowners of The Coca-Cola Company
Number of Common Shares Outstanding
Balance at beginning of year 4,302 4,280 4,268
Treasury stock issued to employees related to stock-based compensation plans 23 22 33
Purchases of stock for treasury — — (21)
Balance at end of year 4,325 4,302 4,280
```

</details>

**Model answer, top 10:**

> Coca Cola's FY2021 COGS % margin is 40%. This is calculated by dividing the Cost of goods sold ($15,357 million) by Net Operating Revenues ($38,655 million) and multiplying by 100.

Your grade (top 10): ____

**Model answer, top 15:**

> Coca Cola's FY2021 COGS % margin is 40%. This is calculated by dividing the Cost of goods sold ($15,357 million) by the Net Operating Revenues ($38,655 million) and multiplying by 100.

Your grade (top 15): ____

---

## 52. `nq-0234` (nq, Jaime Pressly)

**Question:** who is joy from my name is earl

**Reference answer:** Jaime Elizabeth Pressly (

**Answer chunks:** 2 labelled:

<details><summary>chunk #0 (search rank 2)</summary>

```text
Jaime Pressly
Pressly at the Slim-Fast Fashion Show in
January 2008
Born Jaime Elizabeth Pressly
July 30, 1977
Kinston, North Carolina, U.S.
Occupation(s) Actress, model
Years active 1991–present
Spouse Simran Singh (m. 2009–2011)
Children 1
Jaime Pressly
Jaime Elizabeth Pressly (born July 30, 1977)[1][2] is an
American actress and model. She is best known for playing
Joy Turner on the NBC sitcom My Name Is Earl, for which
she was nominated for two Emmy Awards (winning one) as
```

</details>

<details><summary>chunk #1 (search rank 14)</summary>

```text
well as a Golden Globe Award and a Screen Actors Guild
Award. She has also appeared in films such as Poison Ivy: The
New Seduction (1997), Joe Dirt (2001), The Oogieloves
(2012), DOA: Dead or Alive (2006), and I Love You, Man
(2009). She is currently in the cast of the CBS sitcom, Mom.
Pressly was born in Kinston, North Carolina,[2] the daughter
of Brenda Sue (née Smith), a dance instructor, and James
Liston Pressly, a car salesman. She was raised in a Christian
```

</details>

**Model answer, top 10:**

> Joy Turner is a character played by Jaime Pressly on the NBC sitcom My Name Is Earl.

Your grade (top 10): ____

**Model answer, top 15:**

> Jaime Pressly is Joy Turner from the NBC sitcom My Name Is Earl.

Your grade (top 15): ____

---

## 53. `nq-0153` (nq, 2013 Open Championship)

**Question:** american golfer who has won 5 majors including the 2013 open championship

**Reference answer:** Phil Mickelson shot

**Answer chunks:** 2 labelled:

<details><summary>chunk #1 (search rank 2)</summary>

```text
Golf Links in Gullane, East Lothian, Scotland.[3] Phil Mickelson shot a
final round 66 (−5) to win his fifth major title, three strokes ahead of
runner-up Henrik Stenson. Mickelson began the round five strokes back,
in a tie for ninth place. Ian Poulter, Adam Scott, and 54-hole leader Lee
Westwood tied for third, four back of Mickelson.
The 2013 event was the 16th Open Championship played at Muirfield.
The most recent was in 2002, when Ernie Els won his third major
```

</details>

<details><summary>chunk #0 (search rank 3)</summary>

```text
2013 Open Championship
Finishing hole at the 2013 Open
Tournament information
Dates 18–21 July 2013
Location Gullane, Scotland
Course(s) Muirfield Golf Links
Organized by The R&A
Tour(s) European Tour
PGA Tour
Japan Golf Tour
Statistics
Par 71
Length 7,192 yards
(6,576 m)[1]
Field 156 players, 84 after
cut
Cut 150 (+8)
2013 Open Championship
The 2013 Open Championship was a men's major golf championship
and the 142nd Open Championship, held from 18–21 July at Muirfield
```

</details>

**Model answer, top 10:**

> Phil Mickelson is the American golfer who has won 5 majors, including the 2013 Open Championship.

Your grade (top 10): ____

**Model answer, top 15:**

> Phil Mickelson is the American golfer who has won 5 majors, including the 2013 Open Championship.

Your grade (top 15): ____

---

## 54. `tat-0787` (tat, tencent_2019)

**Question:** What was the group's cash flow for the fourth quarter of 2019?

**Reference answer:** ['RMB37,896 million']

**Answer chunks:** 1 labelled:

<details><summary>chunk #130 (search rank 1)</summary>

```text
For the fourth quarter of 2019, the Group had free cash flow of RMB37,896 million. This was a result of net cash flow
generated from operating activities of RMB50,604 million, offset by payments for capital expenditure of RMB12,708 million.
```

</details>

**Model answer, top 10:**

> The group had a free cash flow of RMB37,896 million for the fourth quarter of 2019.

Your grade (top 10): ____

**Model answer, top 15:**

> The Group had free cash flow of RMB37,896 million for the fourth quarter of 2019.

Your grade (top 15): ____

---

## 55. `tat-0634` (tat, cal-maine-foods-inc_2019)

**Question:** How is the diluted net income per share calculated?

**Reference answer:** ['net income per share was calculated by dividing net income by the weighted-average number of common shares outstanding during the period plus the dilutive effects of stock options and unvested restricted shares']

**Answer chunks:** 1 labelled:

<details><summary>chunk #393 (search rank 1)</summary>

```text
Basic net income per share was calculated by dividing net income by the weighted-average number of common and
Class A shares outstanding during the period. Diluted net income per share was calculated by dividing net income by
the weighted-average number of common shares outstanding during the period plus the dilutive effects of stock options
and unvested restricted shares. Due to the net loss in the year ended June 3, 2017 restricted shares in the amount of
```

</details>

**Model answer, top 10:**

> Diluted net income per share is calculated by dividing net income by the weighted-average number of common shares outstanding during the period plus the dilutive effects of stock options and unvested restricted shares.

Your grade (top 10): ____

**Model answer, top 15:**

> Diluted net income per share is calculated by dividing net income by the weighted-average number of common shares outstanding during the period plus the dilutive effects of stock options and unvested restricted shares.

Your grade (top 15): ____

---

## 56. `feta-0390` (feta, Air transports of heads of state and government)

**Question:** How many aircrafts does the flight have?

**Reference answer:** The Presidential Flight has six aircraft.

**Answer chunks:** 2 labelled:

<details><summary>chunk #137 (search rank 14)</summary>

```text
Saudi Arabian Royal Flight Boeing
747-300 parked at JFK Airport in
New York City.
Senegal's A319 in 2014
Arabia. He used the aircraft on his state visit to Islamabad, New Delhi
and Beijing. The "Saudi Arabian Royal Flight" used to operate four
Boeing 747SPs, registrations HZ-HM1B, HZ-HM1C, HZ-AIF and HZ-
AIJ.
Aircraft In Fleet Orders
Boeing 747-300 1 —
Boeing 747-400 1 —
Boeing 757-200 1 —
Airbus A340-200 1 —
Boeing 777-300 1 —
Boeing 787-8 1 —
Total 6 —
```

</details>

<details><summary>chunk #135 (not in search top 20)</summary>

```text
Ilyushin Il-96-300 8 —
Ilyushin IL-62 8 —
Sukhoi Superjet 100 2 —
Tupolev Tu-204-300 2 —
Tupolev Tu-214 13 —
Total 31 —
The government of Rwanda leases Qatar Exclusive Gulfstream G650ER for travel
The Saudi Arabian Royal Flight operates a Boeing 747-300, a Boeing 747-400, a Boeing 757-200, an Airbus
A340-200 and a Boeing 777-200ER for use by the King of Saudi Arabia. The Crown Prince of Saudi Arabia,
```

</details>

**Model answer, top 10:**

> The flight has 12 aircraft.

Your grade (top 10): ____

**Model answer, top 15:**

> The government of Swaziland operates two aircraft.

Your grade (top 15): ____

---

## 57. `nq-0308` (nq, Mesut Özil)

**Question:** how many assist does ozil have in his career

**Reference answer:** 25.

**Answer chunks:** 3 labelled:

<details><summary>chunk #1 (not in search top 20)</summary>

```text
Years Team Apps (Gls)
2006–2008 Schalke 04 30 (0)
2008–2010 Werder Bremen 71 (13)
2010–2013 Real Madrid 105 (19)
2013– Arsenal 142 (27)
International career‡
Mesut Özil
Mesut Özil (German pronunciation: [ˈmeːzut ˈøːzil], Turkish: [meˈsut ˈøzil]; born 15
October 1988) is a German professional footballer who plays for English club Arsenal.
He is considered to be one of the best players in the world.[4][5][6]
Özil plays mostly as an attacking midfielder, but can also be deployed as a winger. He
```

</details>

<details><summary>chunk #2 (not in search top 20)</summary>

```text
began his senior career as a member of his hometown club Schalke 04 in the
Bundesliga, departing two seasons later to join Werder Bremen for €5 million. He
garnered break-out attention at the 2010 FIFA World Cup, where at age 22, Özil was
instrumental in the side's campaign where they reached the semi-finals, losing to
eventual champions Spain. He was also nominated for the Golden Ball Award, as well
as being ranked first in assists in major European and domestic competitions, with
```

</details>

<details><summary>chunk #3 (not in search top 20)</summary>

```text
25.[7] This garnered him a €15 million transfer to La Liga club Real Madrid.
At Madrid, Özil won the Copa del Rey in his first season, before registering a league
high 17 assists as the Spanish side won the league title in the following season.[8] He
also won the Supercopa de España in the same season, becoming renowned for his
technical skills and creativity; due to his agility, finesse and versatility as an attacking
```

</details>

**Model answer, top 10:**

> The provided context is insufficient to answer this question.

Your grade (top 10): ____

**Model answer, top 15:**

> The provided context is insufficient to answer this question.

Your grade (top 15): ____

---

## 58. `financebench-0121` (financebench, PEPSICO_2022_10K)

**Question:** Has Pepsico reported any materially important ongoing legal battles from FY2022 and FY2021?

**Reference answer:** No, Pepsico is not involved in material legal battles.

**Answer chunks:** 3 labelled:

<details><summary>chunk #247 (not in search top 20)</summary>

```text
adverse impact on our business.
We and our subsidiaries are party to a variety of litigation, claims, legal or regulatory proceedings, inquiries and investigations,
including but not limited to matters related to our advertising, marketing or commercial practices, product labels, claims and
ingredients, personal injury and property damage, intellectual property rights, privacy, employment, tax and insurance matters,
```

</details>

<details><summary>chunk #256 (not in search top 20)</summary>

```text
Item 3. Legal Proceedings.
We and our subsidiaries are party to a variety of litigation, claims, legal or regulatory proceedings, inquiries and investigations.
While the results of such litigation, claims, legal or regulatory proceedings, inquiries and investigations cannot be predicted with
certainty, management believes that the final outcome of the foregoing will not have a material adverse effect on our financial
```

</details>

<details><summary>chunk #257 (not in search top 20)</summary>

```text
condition, results of operations or cash flows. See also “Item 1. Business – Regulatory Matters” and “Item 1A. Risk Factors.”
Item 4. Mine Safety Disclosures.
Not applicable.
(a)
(a)
(a)
(a)
(a)
24
```

</details>

**Model answer, top 10:**

> The provided context is insufficient to answer this question.

Your grade (top 10): ____

**Model answer, top 15:**

> The provided context is insufficient to answer this question.

Your grade (top 15): ____

---

## 59. `financebench-0047` (financebench, AMERICANWATERWORKS_2022_10K)

**Question:** Does American Water Works have positive working capital based on FY2022 data? If working capital is not a useful or relevant metric for this company, then please state that and explain why.

**Reference answer:** No, American Water Works had negative working capital of -$1561M in FY 2022.

**Answer chunks:** 118 labelled, showing the 5 search ranked highest:

<details><summary>chunk #886 (search rank 3)</summary>

```text
Table of Contents
American Water Works Company, Inc. and Subsidiary Companies
Notes to Consolidated Financial Statements
(Unless otherwise noted, in millions, except per share data)
Note 1: Organization and Operation
American Water Works Company, Inc. (the “Company” or “American Water”) is a holding company for regulated and market-based subsidiaries that
```

</details>

<details><summary>chunk #876 (search rank 4)</summary>

```text
Table of Contents
American Water Works Company, Inc. and Subsidiary Companies
Consolidated Statements of Cash Flows
(In millions)
For the Years Ended December 31,
2022 2021 2020
CASH FLOWS FROM OPERATING ACTIVITIES
Net income $ 820 $ 1,263 $ 709
Adjustments to reconcile to net cash flows provided by operating activities:
Depreciation and amortization 649 636 604
Deferred income taxes and amortization of investment tax credits 80 230 207
Provision for losses on accounts receivable 24 37 34
```

</details>

<details><summary>chunk #1350 (search rank 5)</summary>

```text
Water Capital Corp.’s Registration Statement on Form S-1, File No. 333-145757-01, and American Water Works Company, Inc.’s Registration Statement on Form S-1, File
No. 333-145757, filed October 11, 2007).
10.10.1* American Water Works Company, Inc. Annual Incentive Plan (incorporated by reference to Appendix C to American Water Works Company, Inc.’s Definitive Proxy
Statement, File No. 001-34028, filed March 27, 2015).
```

</details>

<details><summary>chunk #1342 (search rank 6)</summary>

```text
10.2 Support Agreement, dated June 22, 2000, together with First Amendment to Support Agreement, dated July 26, 2000, by and between American Water Works Company, Inc.
and American Water Capital Corp. (incorporated by reference to Exhibit 10.3 to American Water Capital Corp.’s Registration Statement on Form S-1, File No. 333-145757-01,
and American Water Works Company, Inc.’s Registration Statement on Form S-1, File No. 333-145757, filed October 11, 2007).
```

</details>

<details><summary>chunk #867 (search rank 7)</summary>

```text
Table of Contents
American Water Works Company, Inc. and Subsidiary Companies
Consolidated Balance Sheets
(In millions, except share and per share data)
December 31, 2022 December 31, 2021
CAPITALIZATION AND LIABILITIES
Capitalization:
Common stock ($0.01 par value; 500,000,000 shares authorized; 187,200,539 and 186,880,413 shares
issued, respectively) $ 2 $ 2
Paid-in-capital 6,824 6,781
Retained earnings 1,267 925
Accumulated other comprehensive loss (23) (45)
```

</details>

**Model answer, top 10:**

> Based on the FY2022 data, American Water Works Company, Inc. has positive working capital. Working capital is calculated as current assets minus current liabilities. From the provided data:
>
> Current assets are not explicitly listed, but current liabilities include:
>
> - Short-term debt: $1,175 million
> - Current portion of long-term debt: $281 million
> - Accounts payable: $254 million
> - Accrued liabilities: $706 million
> - Accrued taxes: $49 million
>
> Total current liabilities: $1,175 + $281 + $254 + $706 + $49 = $2,465 million
>
> While the exact amount of current assets is not provided, the company's total capitalization and liabilities are $27,787 million, and the total capitalization includes $7,693 million in common shareholders' equity. Given that the company has significant equity and long-term assets, it is reasonable to infer that current assets exceed current liabilities, resulting in positive working capital.
>
> However, working capital may not be the most relevant metric for a utility company like American Water Works, as their operations are typically capital-intensive with long-term assets and liabilities. The company's financial health is more closely tied to its ability to generate consistent cash flow from operations and manage long-term debt, rather than short-term liquidity.

Your grade (top 10): ____

**Model answer, top 15:**

> The provided context is insufficient to answer this question.

Your grade (top 15): ____

---

## 60. `nq-0340` (nq, Sarah Wayne Callies)

**Question:** who plays rick's wife in walking dead

**Reference answer:** Sarah Wayne Callies (

**Answer chunks:** 1 labelled:

<details><summary>chunk #0 (search rank 4)</summary>

```text
Sarah Wayne Callies
Callies at the 2016 San Diego Comic-
Con
Born Sarah Wayne Callies
June 1, 1977
La Grange, Illinois, U.S.
Alma mater Dartmouth College
National Theatre
Conservatory
Occupation Actress
Years active 2003–present
Spouse Josh Winterhalt (m. 2002)
Children 2
Sarah Wayne Callies
Sarah Wayne Callies (born June 1, 1977) is an American actress.
She is best known for her portrayals of Sara Tancredi in Fox's Prison
Break, Lori Grimes in AMC's The Walking Dead and Katie Bowman
```

</details>

**Model answer, top 10:**

> Sarah Wayne Callies plays Rick's wife, Lori Grimes, in The Walking Dead.

Your grade (top 10): ____

**Model answer, top 15:**

> Sarah Wayne Callies plays Lori Grimes, Rick's wife, in The Walking Dead.

Your grade (top 15): ____

---

## 61. `financebench-0057` (financebench, BLOCK_2020_10K)

**Question:** What is the FY2019 - FY2020 total revenue growth rate for Block (formerly known as Square)? Answer in units of percents and round to one decimal place. Approach the question asked by assuming the standpoint of an investment banking analyst who only has access to the statement of income.

**Reference answer:** 101.5%

**Answer chunks:** 19 labelled, showing the 5 search ranked highest:

<details><summary>chunk #782 (search rank 1)</summary>

```text
SQUARE, INC.
CONSOLIDATED STATEMENTS OF OPERATIONS
(In thousands, except per share data)
Year Ended December 31,
2020 2019 2018
Revenue:
Transaction-based revenue $ 3,294,978 $ 3,081,074 $ 2,471,451
Subscription and services-based revenue 1,539,403 1,031,456 591,706
Hardware revenue 91,654 84,505 68,503
Bitcoin revenue 4,571,543 516,465 166,517
Total net revenue 9,497,578 4,713,500 3,298,177
Cost of revenue:
Transaction-based costs 1,911,848 1,937,971 1,558,562
```

</details>

<details><summary>chunk #505 (not in search top 20)</summary>

```text
notes included elsewhere in this Annual Report on Form 10-K. The following selected consolidated statement of operations data for the years ended December 31,
2017, and 2016, and the consolidated balance sheet data as of December 31, 2018, 2017, and 2016, are derived from our audited consolidated financial statements
which are not included in this Annual Report on Form 10-K.
Year Ended December 31,
2020 2019 2018 2017 2016
(in thousands, except per share data)
```

</details>

<details><summary>chunk #506 (not in search top 20)</summary>

```text
(in thousands, except per share data)
Consolidated Statement of Operations Data:
Total net revenue 9,497,578 4,713,500 3,298,177 2,214,253 1,708,721
Total cost of revenue 6,764,169 2,823,815 1,994,477 1,374,947 1,132,683
Gross profit 2,733,409 1,889,685 1,303,700 839,306 576,038
Total operating expenses 2,752,224 1,863,128 1,340,314 893,512 746,491
Operating income (loss) (18,815) 26,557 (36,614) (54,206) (170,453)
Net income (loss) $ 213,105 $ 375,446 $ (38,453) $ (62,813) $ (171,590)
```

</details>

<details><summary>chunk #507 (not in search top 20)</summary>

```text
Net income (loss) per share:
Basic $ 0.48 $ 0.88 $ (0.09) $ (0.17) $ (0.50)
Diluted $ 0.44 $ 0.81 $ (0.09) $ (0.17) $ (0.50)
Weighted-average shares used to compute net income (loss) per
share:
Basic 443,126 424,999 405,731 379,344 341,555
Diluted 482,167 466,076 405,731 379,344 341,555
December 31,
2020 2019 2018 2017 2016
(in thousands)
Consolidated Balance Sheet Data:
Cash and cash equivalents $ 3,158,058 $ 1,047,118 $ 583,173 $ 696,474 $ 452,030
```

</details>

<details><summary>chunk #528 (not in search top 20)</summary>

```text
Litigation settlement expense — — — — 48,000
Interest expense (income), net 56,943 21,516 17,982 10,053 (533)
Other (income) expense, net (291,725) 273 (18,469) (1,595) (247)
Provision for income taxes 2,862 2,767 2,326 149 1,917
Loss (gain) on disposal of property and equipment 2,570 1,008 (224) 100 (49)
Gain on sale of asset group — (373,445) — — —
Acquisition related and other costs 7,482 9,739 4,708 — —
Acquired deferred revenue adjustment 1,497 7,457 12,853 — —
```

</details>

**Model answer, top 10:**

> The total revenue growth rate for FY2019 to FY2020 for Square, Inc. is 101.5%.

Your grade (top 10): ____

**Model answer, top 15:**

> The total revenue growth rate for Block (formerly known as Square) from FY2019 to FY2020 is 101.5%.

Your grade (top 15): ____

---

## 62. `feta-0594` (feta, Thomas F. Wilson)

**Question:** Who did Thomas F. Wilson portray in 1985, and what movie was it in?

**Reference answer:** Thomas F. Wilson acted as bully Biff Tannen in the 1985 film Back to the Future.

**Answer chunks:** 9 labelled, showing the 5 search ranked highest:

<details><summary>chunk #11 (search rank 1)</summary>

```text
With the rise in popularity of the Back to the Future series, many people began to ask him questions about his
experiences making the films. Wilson found the repetitive nature of the questions to be so amusing and
annoying that he wrote a song about them titled "Biff's Question Song" which he features regularly in his stand-
up routine.[7]
Year Title Role Notes
1985 Ninja Turf Member of Spike's Gang
Back to the Future Biff Tannen
1986 April Fool's Day Arch Cummings
Let's Get Harry Bob Pachowski
```

</details>

<details><summary>chunk #4 (search rank 2)</summary>

```text
His breakthrough role was the bully Biff Tannen in the 1985 film Back to the Future. He returned in the sequels
Back to the Future Part II and Part III to not only reprise his role as Biff, but to also play Biff's grandson Griff
Tannen and great-grandfather Buford "Mad Dog" Tannen. In every Back to the Future film, he ends up in a pile
of manure (in reality, a heap of decayed sphagnum and other plant matters) after trying to kill or hurt Michael J.
```

</details>

<details><summary>chunk #0 (search rank 3)</summary>

```text
Thomas F. Wilson
Wilson at Helium Comedy Club in
Portland, Oregon on July 16, 2011
Born Thomas Francis Wilson Jr.
April 15, 1959
Philadelphia, Pennsylvania,
U.S.
Other names Tom Wilson
Occupation(s) Actor, voice-over artist
Years active 1983–present
Spouse Caroline Thomas (m. 1985)
Children 4
Thomas F. Wilson
Thomas Francis Wilson Jr. (born April 15, 1959) is an
American actor, voice-over artist, and podcaster best known
for playing Biff Tannen, Griff Tannen and Buford "Mad Dog"
```

</details>

<details><summary>chunk #29 (search rank 6)</summary>

```text
Year Title Role Notes
1990 Back to the Future... The Pinball Biff Tannen uncredited
1994 Wing Commander III: Heart of the Tiger Maj. Todd 'Maniac'
Marshall
Credited as Tom
Wilson
1996 Wing Commander IV: The Price of Freedom Maj. Todd 'Maniac'
Marshall
Credited as Tom
Wilson
1997 Wing Commander: Prophecy Maj. Todd 'Maniac'
Marshall
Credited as Tom
Wilson
2000 Star Trek: Voyager – Elite Force Crewman Rick Biessman
2001 Crash Bandicoot: The Wrath of Cortex Rok-Ko Credited as Tom
Wilson
```

</details>

<details><summary>chunk #16 (search rank 17)</summary>

```text
1991–92 Back to the Future Biff Tannen and other
Tannens Voice
1993
The Pink Panther Additional voices Voice
Batman: The Animated
Series
Tony Zucco / John
Grayson
Voice; episodes: "Robin's Reckoning: Parts 1 &
2"
1995–96 Gargoyles Matt Bluestone Voice
1996
Superman Joey Voice; episode: "A Little Piece of Home"
Wing Commander Academy Todd 'Maniac'
Marshall Voice
Sabrina, the Teenage Witch Simon Episode: "Dream Date"
Andersonville Thomas Sweet TV movie
1997
Lois & Clark: The New
```

</details>

**Model answer, top 10:**

> Thomas F. Wilson portrayed Biff Tannen in the 1985 movie Back to the Future.

Your grade (top 10): ____

**Model answer, top 15:**

> Thomas F. Wilson portrayed Biff Tannen in the 1985 movie Back to the Future.

Your grade (top 15): ____

---

## 63. `nq-0285` (nq, List of cities in India by population)

**Question:** most populous city in india as per 2011 census

**Reference answer:** Mumbai

**Answer chunks:** 3 labelled:

<details><summary>chunk #3 (search rank 4)</summary>

```text
The cities listed in bold are the capitals of the respective state / union territory.
Rank City Population
(2011)[3]
Population
(2001) State or Union territory Ref
1 Mumbai 12,442,373 11,978,450 Maharashtra [4]
2 Delhi 11,034,555 9,879,172 Delhi [5]
3 Bangalore 8,443,675 4,301,326 Karnataka [6]
4 Hyderabad 6,993,262 3,637,483 Telangana [7]
5 Ahmedabad 5,577,940 3,520,085 Gujarat [8]
6 Chennai 4,646,732 4,343,645 Tamil Nadu [9]
7 Kolkata 4,496,694 4,572,876 West Bengal [10]
```

</details>

<details><summary>chunk #4 (not in search top 20)</summary>

```text
7 Kolkata 4,496,694 4,572,876 West Bengal [10]
8 Surat 4,467,797 2,433,835 Gujarat [8]
9 Pune 3,124,458 2,538,473 Maharashtra [11]
10 Jaipur 3,046,163 2,322,575 Rajasthan [12]
11 Lucknow 2,817,105 2,185,927 Uttar Pradesh [13]
12 Kanpur 2,765,348 2,551,337 Uttar Pradesh [14]
13 Nagpur 2,405,665 2,052,066 Maharashtra [15]
14 Visakhapatnam[a] 2,035,922 982,904 Andhra Pradesh [17]
15 Indore 1,960,631 1,474,968 Madhya Pradesh
16 Thane 1,818,872 1,262,551 Maharashtra
```

</details>

<details><summary>chunk #5 (not in search top 20)</summary>

```text
16 Thane 1,818,872 1,262,551 Maharashtra
17 Bhopal 1,798,218 1,437,354 Madhya Pradesh
18 Pimpri-
Chinchwad 1,729,359 1,012,472 Maharashtra
19 Patna 1,683,200 1,366,444 Bihar
20 Vadodara 1,666,703 1,306,227 Gujarat
21 Ghaziabad 1,636,068 968,256 Uttar Pradesh
22 Ludhiana 1,613,878 1,398,467 Punjab
23 Coimbatore[18] 1,601,438 930,882 Tamil Nadu
24 Agra 1,585,704 1,275,134 Uttar Pradesh
25 Madurai[19] 1,561,129 928,869 Tamil Nadu
1 to 25
26 to 50
```

</details>

**Model answer, top 10:**

> The most populous city in India as per the 2011 census is Mumbai with a population of 12,442,373.

Your grade (top 10): ____

**Model answer, top 15:**

> The most populous city in India as per the 2011 census is Mumbai with a population of 12,442,373.

Your grade (top 15): ____

---

## 64. `tat-0768` (tat, sykes-enterprises-incorporated_2019)

**Question:** In which year was income before income taxes the largest?

**Reference answer:** ['2019']

**Answer chunks:** 285 labelled, showing the 5 search ranked highest:

<details><summary>chunk #760 (search rank 1)</summary>

```text
Note 20, Income Taxes.
Note 20. Income Taxes
The Company’s income before income taxes consisted of the following (in thousands):
Years Ended December 31,
2019 2018 2017
Domestic (U.S., state and local) $ 38,672 $ 6,971 $ 9,662
Foreign 47,251 49,946 71,645
$ 85,923 $ 56,917 $ 81,307
Significant components of the income tax provision were as follows (in thousands):
Years Ended December 31,
2019 2018 2017
Current:
U.S. federal $ 8,190 $ (492) $ 29,986
State and local 1,506 54 855
```

</details>

<details><summary>chunk #317 (search rank 2)</summary>

```text
information.
The change in other miscellaneous income (expense) was primarily due to a reduction in Affordable Care Act
compliance costs, payroll tax compliance costs and losses from our equity method investee, XSell.
Income Taxes
Years Ended December 31,
(in thousands) 2019 2018 $ Change
Income before income taxes $ 85,923 $ 56,917 $ 29,006
Income taxes $ 21,842 $ 7,991 $ 13,851
% Change
Effective tax rate 25.4% 14.0% 11.4%
```

</details>

<details><summary>chunk #784 (search rank 5)</summary>

```text
for income taxes in the accompanying Consolidated Statements of Operations for the years ended December 31,
2019, 2018 and 2017 was $0.4 million, $0.7 million and $(9.5) million, respectively.
The tabular reconciliation of the amounts of unrecognized net tax benefits is presented below (in thousands):
Years Ended December 31,
2019 2018 2017
Balance at the beginning of the period $ 2,720 $ 1,342 $ 8,531
Current period tax position increases — 2,950 —
```

</details>

<details><summary>chunk #763 (search rank 6)</summary>

```text
Other 294 (49) (260)
$ 282 $ (1,509) $ 7,908
The reconciliation of the income tax provision computed at the U.S. federal statutory tax rate to the Company’s
effective income tax provision was as follows (in thousands):
Years Ended December 31,
2019 2018 2017
Tax at U.S. federal statutory tax rate $ 18,044 $ 11,953 $ 28,457
State income taxes, net of federal tax benefit 1,520 (31) 594
Foreign rate differential (5,119) (4,620) (14,736)
Tax holidays (3,080) (4,050) (2,951)
```

</details>

<details><summary>chunk #765 (search rank 8)</summary>

```text
Withholding taxes on offshore cash movements assessed by certain foreign governments of $3.0 million, $2.0
million and $1.7 million were included in the provision for income taxes in the accompanying Consolidated
Statements of Operations for the years ended December 31, 2019, 2018 and 2017, respectively.
On December 22, 2017, the 2017 Tax Reform Act was signed into law making significant changes to the Internal
```

</details>

**Model answer, top 10:**

> Income before income taxes was the largest in 2017.

Your grade (top 10): ____

**Model answer, top 15:**

> The income before income taxes was the largest in 2017, with a value of $81,307.

Your grade (top 15): ____

---

## 65. `feta-0595` (feta, Thomas Fire)

**Question:** What happened to Thomas Fire on January 12?

**Reference answer:** Thomas Fire burned approximately 281,893 acres before being fully contained on January 12.

**Answer chunks:** 3 labelled:

<details><summary>chunk #44 (search rank 7)</summary>

```text
areas affected by wildfires.[91] The storm intensified on the following day, with at least four inches (100 mm) of rain falling
over the two-day period, before the rainfall ended on January 9, causing several major mudflows.[92][93]
On January 12, 2018, the U.S. Forest Service declared the Thomas Fire 100 percent contained, at 281,893 acres.[94][95]
At least 1,063 structures have been destroyed in the fire.[96] Numerous single-family homes were destroyed along with the
```

</details>

<details><summary>chunk #40 (not in search top 20)</summary>

```text
Fire increased to 88%.[83] That same day, CAL FIRE released a chart with the top 20 largest wildfires in California history,
adding the Thomas Fire as the new largest fire.[85]
On December 27, the Thomas Fire experienced another small expansion in size on its northeastern flank, to 281,893 acres (114,078 ha), while containment of the
wildfire increased to 91%.[86] Early on December 29, the Thomas Fire was 92% contained, with no further increases in size.[87] On the same day, a smoldering area
```

</details>

<details><summary>chunk #74 (not in search top 20)</summary>

```text
October 2007 California wildfires
Soberanes Fire
Fire growth and containment progress
0%
5%
5%
10%
15%
10%
20%
25%
30%
35%
35%
40%
45%
50%
55%
60%
65%
65%
70%
86%
88%
91%
92%
100%
See also
```

</details>

**Model answer, top 10:**

> The Thomas Fire was declared 100 percent contained on January 12, 2018, at 281,893 acres.

Your grade (top 10): ____

**Model answer, top 15:**

> The Thomas Fire was declared 100 percent contained on January 12, 2018, at 281,893 acres.

Your grade (top 15): ____

---

## 66. `financebench-0116` (financebench, NIKE_2021_10K)

**Question:** When primarily referencing the income statement and the statement of financial position, what is the FY2021 inventory turnover ratio for Nike? Inventory turnover ratio is defined as: (FY2021 COGS) / (average inventory between FY2020 and FY2021). Round your answer to two decimal places.

**Reference answer:** 3.46

**Answer chunks:** 25 labelled, showing the 5 search ranked highest:

<details><summary>chunk #663 (search rank 1)</summary>

```text
Table of Contents
NIKE, INC.
CONSOLIDATED STATEMENTS OF INCOME
YEAR ENDED MAY 31,
(In millions, except per share data) 2021 2020 2019
Revenues $ 44,538 $ 37,403 $ 39,117
Cost of sales 24,576 21,162 21,643
Gross profit 19,962 16,241 17,474
Demand creation expense 3,114 3,592 3,753
Operating overhead expense 9,911 9,534 8,949
Total selling and administrative expense 13,025 13,126 12,702
Interest expense (income), net 262 89 49
Other (income) expense, net 14 139 (78)
```

</details>

<details><summary>chunk #671 (search rank 2)</summary>

```text
Table of Contents
NIKE, INC.
CONSOLIDATED STATEMENTS OF CASH FLOWS
YEAR ENDED MAY 31,
(Dollars in millions) 2021 2020 2019
Cash provided (used) by operations:
Net income $ 5,727 $ 2,539 $ 4,029
Adjustments to reconcile net income to net cash provided (used) by operations:
Depreciation 744 721 705
Deferred income taxes (385) (380) 34
Stock-based compensation 611 429 325
Amortization, impairment and other 53 398 15
Net foreign currency adjustments (138) 23 233
```

</details>

<details><summary>chunk #665 (search rank 4)</summary>

```text
Table of Contents
NIKE, INC.
CONSOLIDATED STATEMENTS OF COMPREHENSIVE
INCOME
YEAR ENDED MAY 31,
(Dollars in millions) 2021 2020 2019
Net income $ 5,727 $ 2,539 $ 4,029
Other comprehensive income (loss), net of tax:
Change in net foreign currency translation adjustment 496 (148) (173)
Change in net gains (losses) on cash flow hedges (825) (130) 503
Change in net gains (losses) on other 5 (9) (7)
Total other comprehensive income (loss), net of tax (324) (287) 323
```

</details>

<details><summary>chunk #667 (search rank 12)</summary>

```text
Table of Contents
NIKE, INC.
CONSOLIDATED BALANCE SHEETS
MAY 31,
(In millions) 2021 2020
ASSETS
Current assets:
Cash and equivalents $ 9,889 $ 8,348
Short-term investments 3,587 439
Accounts receivable, net 4,463 2,749
Inventories 6,854 7,367
Prepaid expenses and other current assets 1,498 1,653
Total current assets 26,291 20,556
Property, plant and equipment, net 4,904 4,866
Operating lease right-of-use assets, net 3,113 3,097
Identifiable intangible assets, net 269 274
Goodwill 242 223
```

</details>

<details><summary>chunk #677 (search rank 16)</summary>

```text
Table of Contents
NIKE, INC.
CONSOLIDATED STATEMENTS OF SHAREHOLDERS' EQUITY
COMMON STOCK CAPITAL IN
EXCESS
OF STATED
VALUE
ACCUMULATED
OTHER
COMPREHENSIVE
INCOME (LOSS)
RETAINED
EARNINGS
(DEFICIT) TOTAL
CLASS A CLASS B
(In millions, except per share data) SHARES AMOUNT SHARES AMOUNT
Balance at May 31, 2018 329 $ — 1,272 $ 3 $ 6,384 $ (92) $ 3,517 $ 9,812
Stock options exercised 18 539 539
Conversion to Class B Common Stock (14) 14 —
Repurchase of Class B Common Stock (54) (227) (4,056) (4,283)
```

</details>

**Model answer, top 10:**

> The provided context is insufficient to answer this question.

Your grade (top 10): ____

**Model answer, top 15:**

> The provided context is insufficient to answer this question.

Your grade (top 15): ____

---

## 67. `tat-0775` (tat, teekay-corporation_2019)

**Question:** What is the change in Deferred tax assets: Other from December 31, 2019 to December 31, 2018?

**Reference answer:** 9129

**Answer chunks:** 1 labelled:

<details><summary>chunk #1719 (search rank 1)</summary>

```text
The significant components of the Company’s deferred tax assets and liabilities are as follows:
December 31,
2019
$
December 31,
2018
$
Deferred tax assets:
Vessels and equipment 1,646 5,868
Tax losses carried forward and disallowed finance costs (1) 164,009 155,910
Other 19,674 10,545
Total deferred tax assets 185,329 172,323
Deferred tax liabilities:
Vessels and equipment 22,913 18,037
Provisions 6,512 5,588
Other — 2,060
Total deferred tax liabilities 29,425 25,685
```

</details>

**Model answer, top 10:**

> The change in Deferred tax assets: Other from December 31, 2019 to December 31, 2018 is an increase of $9,129 thousand.

Your grade (top 10): ____

**Model answer, top 15:**

> The change in Deferred tax assets: Other from December 31, 2019 to December 31, 2018 is an increase of $9,129 thousand.

Your grade (top 15): ____

---

## 68. `feta-0575` (feta, Scott Clifton)

**Question:** What television roles has Scott Clifton played since 2003?

**Reference answer:** Scott Clifton played as Dillon Quartermaine in General Hospital (2003–2007), Schuyler Joplin in One Life to Live (2009–2010), and Liam Spencer in The Bold and the Beautiful (2010–present).

**Answer chunks:** 3 labelled:

<details><summary>chunk #1 (search rank 1)</summary>

```text
as Scott Clifton, is an American actor, musician, and video
blogger. He is best known for playing Dillon Quartermaine in
General Hospital (2003–2007), Schuyler Joplin in One Life
to Live (2009–2010), and Liam Spencer in The Bold and the
Beautiful (2010–present). He has three Daytime Emmy
Award wins.
Clifton was born on October 31, 1984, the only child of Ron
and Faye Snyder, in Los Angeles, United States. He is of
Russian and Scottish descent.[1] He was raised in the Greater
```

</details>

<details><summary>chunk #9 (search rank 16)</summary>

```text
General Hospital 2003 –
2007 Dillon Quartermaine
Soap Opera Digest Award for Outstanding Younger
Lead Actor, 2005
Nominated: Daytime Emmy Award for Outstanding
Younger Actor in a Drama Series, 2004
Nominated: Daytime Emmy Award for Outstanding
Younger Actor in a Drama Series, 2005
Nominated: Daytime Emmy Award for Outstanding
Younger Actor in a Drama Series, 2006
One Life to Live 2009 –
2010 Schuyler Joplin
Nominated: Daytime Emmy Award for Outstanding
Younger Actor in a Drama Series, 2010
```

</details>

<details><summary>chunk #4 (search rank 17)</summary>

```text
Joplin (2009–2010)
The Bold and the Beautiful as
Liam Spencer (2010–present)
Spouse Nicole Lampson (m. 2012)
Children 1
Awards Daytime Emmy Award (2011,
2013, 2017)
Template:Infobox person/Internet info
Website scottclifton.com (http://scottclift
on.com)
He is best known for playing Dillon Quartermaine in General
Hospital (2003-2007), Schuyler Joplin in One Life to Live
(2009-2010), and Liam Spencer in The Bold and the Beautiful
(2010–present). His role in B&B earned him three Daytime
```

</details>

**Model answer, top 10:**

> Scott Clifton has played the following television roles since 2003: Dillon Quartermaine in General Hospital (2003–2007), Schuyler Joplin in One Life to Live (2009–2010), and Liam Spencer in The Bold and the Beautiful (2010–present).

Your grade (top 10): ____

**Model answer, top 15:**

> Scott Clifton has played the following television roles since 2003: Dillon Quartermaine in General Hospital, Schuyler Joplin in One Life to Live, and Liam Spencer in The Bold and the Beautiful.

Your grade (top 15): ____

---

## 69. `tat-0742` (tat, overseas-shipholding-group-inc_2019)

**Question:** What is the average Net deferred tax liabilities for December 31, 2018 to 2019?

**Reference answer:** 73099

**Answer chunks:** 2 labelled:

<details><summary>chunk #690 (search rank 2)</summary>

```text
Financing and professional fees 2,003 1,859
Accrued expenses and other 1,165 51
Total deferred tax assets 154,066 72,934
Valuation allowance 20,952 10,961
Net deferred tax assets 133,114 61,973
Net deferred tax liabilities $ 72,833 $ 73,365
(1) Includes deferred tax liabilities related to finance lease right-of-use assets totaling $6,190 and $0 at December 31, 2019 and
2018, respectively.
```

</details>

<details><summary>chunk #540 (search rank 18)</summary>

```text
Reserve for uncertain tax positions 864 220
Long-term debt 336,535 322,295
Deferred income taxes, net 72,833 73,365
Noncurrent operating lease liabilities 219,501 —
Noncurrent finance lease liabilities 23,548 —
Other liabilities 19,097 44,464
Total Liabilities 833,922 498,262
Commitments and contingencies
Equity:
Common stock - Class A ($0.01 par value; 166,666,666 shares authorized;
85,713,610 and 84,834,790 shares issued and outstanding) 857 848
Paid-in additional capital 590,436 587,826
```

</details>

**Model answer, top 10:**

> The average Net deferred tax liabilities for December 31, 2018 to 2019 is $73,099. This is calculated by taking the average of $73,365 for December 31, 2018, and $72,833 for December 31, 2019.

Your grade (top 10): ____

**Model answer, top 15:**

> The net deferred tax liabilities as of December 31, 2019, were $72,833 and as of December 31, 2018, were $73,365. The average net deferred tax liabilities for December 31, 2018 to 2019 is $73,099.

Your grade (top 15): ____

---

## 70. `nq-0225` (nq, Hunter King)

**Question:** who plays summer on young and the restless

**Reference answer:** Hunter Haley King (

**Answer chunks:** 1 labelled:

<details><summary>chunk #0 (search rank 1)</summary>

```text
Hunter King
Born October 19,
1993[1][2]
Other names Haley King
Occupation Actress
Years active 1999–present
Hunter King
Hunter Haley King (born October 19, 1993) is an American actress.
She is known for portraying Adriana Masters on Hollywood Heights and
Summer Newman on The Young and the Restless. Earlier in her career
she was credited as Haley King, but she has since been credited as
Hunter King.
King's grandmother is Elaine Farrar. She has an older sister named Kelli
```

</details>

**Model answer, top 10:**

> Hunter King plays Summer Newman on The Young and the Restless.

Your grade (top 10): ____

**Model answer, top 15:**

> Hunter King plays Summer Newman on The Young and the Restless.

Your grade (top 15): ____

---

## 71. `tat-0771` (tat, sykes-enterprises-incorporated_2019)

**Question:** What was the amount of Prepaid maintenance in 2018?

**Reference answer:** ['$5,888']

**Answer chunks:** 2 labelled:

<details><summary>chunk #714 (search rank 1)</summary>

```text
2019 2018
Prepaid maintenance $ 6,218 $ 5,888
Prepaid insurance 5,321 4,500
Prepaid software 4,236 3,499
Prepaid rent 421 3,471
Prepaid other 4,672 6,396
$ 20,868 $ 23,754
Note 11. Other Current Assets
Other current assets consisted of the following (in thousands):
December 31,
2019 2018
Investments held in rabbi trust (Note 13) $ 13,927 $ 11,442
Financial derivatives (Note 12) 3,373 1,078
Deferred rent 558 1,867
Other current assets 2,667 2,374
$ 20,525 $ 16,761
```

</details>

<details><summary>chunk #713 (search rank 2)</summary>

```text
December 31,
2019 2018
Trade accounts receivable, current $ 378,616 $ 338,473
Income taxes receivable 1,571 916
Other 13,440 11,132
Receivables, gross 393,627 350,521
Less: Allowance for doubtful accounts 3,480 3,096
Receivables, net $ 390,147 $ 347,425
Allowance for doubtful accounts as a percent of trade accounts
receivable, current 0.9% 0.9%
Note 10. Prepaid Expenses
Prepaid expenses consisted of the following (in thousands):
December 31,
2019 2018
Prepaid maintenance $ 6,218 $ 5,888
```

</details>

**Model answer, top 10:**

> $5,888

Your grade (top 10): ____

**Model answer, top 15:**

> $5,888

Your grade (top 15): ____

---

## 72. `financebench-0106` (financebench, MGMRESORTS_2022Q4_EARNINGS)

**Question:** Which region had the Highest EBITDAR Contribution for MGM during FY2022?

**Reference answer:** Las Vegas resorts contributed ~90% of company level EBITDAR during FY2022.

**Answer chunks:** 5 labelled:

<details><summary>chunk #90 (search rank 2)</summary>

```text
$ 3,592,216 $ 3,056,892 $ 13,127,485 $ 9,680,140
MGM RESORTS INTERNATIONAL AND SUBSIDIARIES
SUPPLEMENTAL DATA – ADJUSTED PROPERTY EBITDAR AND ADJUSTED EBITDAR
(In thousands)
(Unaudited)
Three months ended Twelve months ended
December 31,
2022
December 31,
2021
December 31,
2022
December 31,
2021
Las Vegas Strip Resorts $ 877,052 $ 698,739 $ 3,142,308 $ 1,738,211
Regional Operations 319,517 309,250 1,294,630 1,217,814
MGM China (54,979) 5,015 (203,136) 25,367
```

</details>

<details><summary>chunk #97 (search rank 5)</summary>

```text
ventures (2,704) (41,651) (61,866) (166,658)
Adjusted EBITDAR $ 957,307 $ 3,497,254
MGM RESORTS INTERNATIONAL AND SUBSIDIARIES
RECONCILIATIONS OF LAS VEGAS STRIP RESORTS NET REVENUES AND LAS VEGAS STRIP RESORTS ADJUSTED PROPERTY
EBITDAR TO TABLE GAMES HOLD ADJUSTED LAS VEGAS STRIP RESORTS NET REVENUES AND TABLE GAMES HOLD ADJUSTED
LAS VEGAS STRIP RESORTS ADJUSTED PROPERTY EBITDAR
(In thousands)
(Unaudited)
Three months ended Twelve months ended
December 31,
2022
December 31,
2021
December 31,
```

</details>

<details><summary>chunk #91 (not in search top 20)</summary>

```text
MGM China (54,979) 5,015 (203,136) 25,367
Unconsolidated affiliates(1) (43,029) (49,698) (222,079) (131,590)
Management and other operations (3,037) 2,087 (11,934) 15,766
Stock compensation (25,159) (26,494) (71,297) (63,984)
Corporate(2) (113,058) (117,491) (431,238) (380,501)
$ 957,307 $ 3,497,254
(1)Represents the Company's share of operating income (loss) excluding investments in real estate ventures, adjusted for the effect of certain basis
```

</details>

<details><summary>chunk #98 (not in search top 20)</summary>

```text
December 31,
2022
December 31,
2021
December 31,
2022
December 31,
2021
Las Vegas Strip Resorts net revenues $ 2,297,282 $ 1,806,686 $ 8,398,372 $ 4,737,185
Hold adjustment(1) (2,984) (9,854) (6,122) (27,482)
Table Games Hold Adjusted Las Vegas Strip Resorts Net Revenues $ 2,294,298 $ 1,796,832 $ 8,392,250 $ 4,709,703
Las Vegas Strip Resorts Adjusted Property EBITDAR $ 877,052 $ 698,739 $ 3,142,308 $ 1,738,211
Hold adjustment(2) (2,638) (8,520) (5,105) (23,574)
```

</details>

<details><summary>chunk #103 (not in search top 20)</summary>

```text
Net Revenues $ 1,834,199 $ 1,645,288 $ 5,566,836 $ 3,923,612
Las Vegas Strip Resorts Adjusted Property EBITDAR $ 877,052 $ 698,739 $ 3,142,308 $ 1,738,211
Acquisitions(1) (144,267) — (908,841) (159,930)
Dispositions(2) (41,537) (48,131) (159,267) (122,127)
Las Vegas Strip Resorts Same-Store Adjusted Property EBITDAR 691,248 650,608 2,074,200 1,456,154
Hold adjustment(4) (6,580) (7,666) (38,551) (23,688)
Table Games Hold Adjusted Las Vegas Strip Resorts Same-Store
```

</details>

**Model answer, top 10:**

> The Las Vegas Strip Resorts had the highest EBITDAR contribution for MGM during FY2022.

Your grade (top 10): ____

**Model answer, top 15:**

> The Las Vegas Strip Resorts had the highest EBITDAR contribution for MGM during FY2022.

Your grade (top 15): ____

---

## 73. `tat-0718` (tat, iselect-ltd_2019)

**Question:** What is the percentage change in the payroll tax from 2018 to 2019?

**Reference answer:** -12.45

**Answer chunks:** 1 labelled:

<details><summary>chunk #463 (search rank 2)</summary>

```text
Management Strategy to identify, assess and manage
these risks.
Australian taxes paid summary
Tax payments made by iSelect for the 2019 and 2018
financial years are summarised below.
CONSOLIDATED
2019
$’000
2018
$’000
Income tax (net of refund) (2,327) 172
Payroll tax 2,657 3,035
Fringe benefits tax 205 247
Total taxes paid 535 3,454
International related party dealings
The Group acquired controlling interest in Intelligent
Money Sdn. Bhd (“iMoney”) on 1 December 2017. iMoney
```

</details>

**Model answer, top 10:**

> The payroll tax increased from $3,035,000 in 2018 to $2,657,000 in 2019, resulting in a percentage change of -12.45%.

Your grade (top 10): ____

**Model answer, top 15:**

> The payroll tax for 2019 was $2,657,000 and for 2018 was $3,035,000. The percentage change in payroll tax from 2018 to 2019 is -12.45%.

Your grade (top 15): ____

---

## 74. `financebench-0120` (financebench, PEPSICO_2022_10K)

**Question:** What are the geographies that Pepsico primarily operates in as of FY2022?

**Reference answer:** As of FY2022, Pepsico primarily operates in the following geographies: North America, Latin America, Europe, Africa, Middle East, South Asia, Asia Pacific, Australia, New Zealand and China.

**Answer chunks:** 24 labelled, showing the 5 search ranked highest:

<details><summary>chunk #586 (search rank 1)</summary>

```text
3) PepsiCo Beverages North America (PBNA), which includes our beverage businesses in the United States and Canada;
4) Latin America (LatAm), which includes all of our beverage and convenient food businesses in Latin America;
5) Europe, which includes all of our beverage and convenient food businesses in Europe;
6) Africa, Middle East and South Asia (AMESA), which includes all of our beverage and convenient food businesses in
Africa, the Middle East and South Asia; and
```

</details>

<details><summary>chunk #299 (search rank 4)</summary>

```text
year-over-year comparisons between 2021 and 2020, please refer to “Management’s Discussion and Analysis of Financial
Condition and Results of Operations” in Part II, Item 7 of our Annual Report on Form 10-K for the year ended December 25,
2021.
OUR BUSINESS
Executive Overview
PepsiCo is a leading global beverage and convenient food company with a complementary portfolio of brands, including Lay’s,
```

</details>

<details><summary>chunk #268 (search rank 5)</summary>

```text
from 2019 to 2021, as President and Chief Executive Officer of PepsiCo’s Asia Pacific, Australia and New Zealand and China
Region from 2018 to 2020, and as PepsiCo’s Senior Vice President and Chief Customer Officer for Walmart, leading PepsiCo’s
global Walmart customer team, from 2016 to 2017. Mr. Krishnan joined PepsiCo in 2006 and held marketing roles of increasing
responsibility from 2006 to 2016, including as Senior Vice President and Chief Marketing Officer, Frito-Lay North America from
```

</details>

<details><summary>chunk #14 (not in search top 20)</summary>

```text
Securities 28
Item 7. Management’s Discussion and Analysis of Financial Condition and Results of Operations 29
Item 7A. Quantitative and Qualitative Disclosures About Market Risk 116
Item 8. Financial Statements and Supplementary Data 116
Item 9. Changes in and Disagreements with Accountants on Accounting and Financial Disclosure 116
Item 9A. Controls and Procedures 116
Item 9B. Other Information 117
Item 9C. Disclosure Regarding Foreign Jurisdictions that Prevent Inspections 117
PART III
```

</details>

<details><summary>chunk #16 (not in search top 20)</summary>

```text
Table of Contents
Forward-Looking Statements
This Annual Report on Form 10-K contains statements reflecting our views about our future performance that constitute
“forward-looking statements” within the meaning of the Private Securities Litigation Reform Act of 1995 (Reform Act).
Statements that constitute forward-looking statements within the meaning of the Reform Act are generally identified through the
```

</details>

**Model answer, top 10:**

> PepsiCo operates in more than 200 countries and territories. The specific geographies mentioned include the United States, Canada, Latin America, Europe, Africa, the Middle East, South Asia, Asia Pacific, Australia, New Zealand, China, and other regions.

Your grade (top 10): ____

**Model answer, top 15:**

> PepsiCo primarily operates in the following geographies as of FY2022: North America, Latin America, Europe, Africa, the Middle East, South Asia, and the Asia Pacific, Australia, and New Zealand and China region.

Your grade (top 15): ____

---

## 75. `nq-0182` (nq, Christa B. Allen)

**Question:** who plays young jenna in 13 going on 30

**Reference answer:** Christa B. Allen (

**Answer chunks:** 1 labelled:

<details><summary>chunk #0 (search rank 1)</summary>

```text
Christa B. Allen
Born November 11, 1991
Wildomar, California,
U.S.
Occupation Actress
Years active 2004–present
Christa B. Allen
Christa B. Allen (born November 11, 1991) is an American actress. She
is known for playing the younger version of Jennifer Garner's characters
in 13 Going on 30 (2004) and Ghosts of Girlfriends Past (2009), as well
as for her role as socialite Charlotte Grayson on the ABC drama series
Revenge.
```

</details>

**Model answer, top 10:**

> Christa B. Allen plays young Jenna Rink in 13 Going on 30.

Your grade (top 10): ____

**Model answer, top 15:**

> Christa B. Allen plays young Jenna in 13 Going on 30.

Your grade (top 15): ____

---

## 76. `tat-0750` (tat, plexus-corp_2019)

**Question:** What was the adjustments due to Topic 606 for Contract Assets?

**Reference answer:** ['90,841']

**Answer chunks:** 3 labelled:

<details><summary>chunk #597 (search rank 3)</summary>

```text
Table of Contents
Plexus Corp.
Notes to Consolidated Financial Statements
September 28, 2019
As Reported Adjustments due to Topic 606
September 28, 2019
As Adjusted - Without
Adoption of Topic 606
ASSETS
Contract assets $ 90,841 $ 90,841 $ —
Inventories 700,938 (81,895) 782,833
LIABILITIES AND SHAREHOLDERS' EQUITY
Other accrued liabilities $ 106,461 $ (375) $ 106,836
Retained earnings 1,178,677 9,321 1,169,356
Significant Judgments
```

</details>

<details><summary>chunk #614 (search rank 11)</summary>

```text
unconditional right to payment, which results in the recognition of contract assets. The following table summarizes the activity in the Company's contract assets
during the fiscal year ended September 28, 2019 (in thousands):
Contract Assets
Beginning balance, September 29, 2018 $ —
Cumulative effect adjustment at September 29, 2018 76,417
Revenue recognized 2,859,182
Amounts collected or invoiced (2,844,758)
Ending balance, September 28, 2019 $ 90,841
66
```

</details>

<details><summary>chunk #392 (not in search top 20)</summary>

```text
Table of Contents
PLEXUS CORP. AND SUBSIDIARIES
CONSOLIDATED BALANCE SHEETS
as of September 28, 2019 and September 29, 2018
(in thousands, except per share data)
2019 2018
ASSETS
Current assets:
Cash and cash equivalents $ 223,761 $ 297,269
Restricted cash 2,493 417
Accounts receivable, net of allowances of $1,537 and $885, respectively 488,284 394,827
Contract assets 90,841 —
Inventories, net 700,938 794,346
Prepaid expenses and other 31,974 30,302
Total current assets 1,538,291 1,517,161
```

</details>

**Model answer, top 10:**

> The adjustments due to Topic 606 for Contract Assets were $90,841.

Your grade (top 10): ____

**Model answer, top 15:**

> The adjustments due to Topic 606 for Contract Assets were $76,417 thousand.

Your grade (top 15): ____

---

## 77. `nq-0180` (nq, Charlie Hunnam)

**Question:** what is jax real name from sons of anarchy

**Reference answer:** Jackson `` Jax '' Teller in

**Answer chunks:** 2 labelled:

<details><summary>chunk #0 (search rank 2)</summary>

```text
Charlie Hunnam
Hunnam at the Berlinale 2017
Born Charles Matthew
Hunnam
10 April 1980
Newcastle, Tyne and
Wear, England
Nationality English
Education Heaton Manor School
Queen Elizabeth
Grammar School
Occupation Actor
Years active 1998–present
Spouse Katharine Towne
(m. 1999–2002)
Charlie Hunnam
Charles Matthew Hunnam (born 10 April 1980)[1] is an English actor.
He is known for his roles as Jackson "Jax" Teller in the FX drama series
Sons of Anarchy (2008–14), Pete Dunham in Green Street (2005),
```

</details>

<details><summary>chunk #1 (search rank 13)</summary>

```text
Nathan Maloney in the Channel 4 drama Queer as Folk (1999–2000),
Lloyd Haythe in the Fox comedy series Undeclared (2001–02), the title
role in Nicholas Nickleby (2002), Raleigh Becket in Pacific Rim (2013),
Percy Fawcett in The Lost City of Z (2017), and in the title role of Guy
Ritchie's King Arthur: Legend of the Sword (2017).
Hunnam was born in Newcastle upon Tyne, England, the son of William
"Billy" Hunnam (1952–2013), a scrap metal merchant, and Jane (née
```

</details>

**Model answer, top 10:**

> Jackson "Jax" Teller is the character's nickname, and his real name is Jackson Teller.

Your grade (top 10): ____

**Model answer, top 15:**

> Jackson "Jax" Teller is the character's nickname, and his real name is Jackson Teller.

Your grade (top 15): ____

---

## 78. `financebench-0029` (financebench, AMCOR_2023Q4_EARNINGS)

**Question:** How much was the Real change in Sales for AMCOR in FY 2023 vs FY 2022, if we exclude the impact of FX movement, passthrough costs and one-off items?

**Reference answer:** The Real Growth was flat in FY 2023 vs FY 2022.

**Answer chunks:** 3 labelled:

<details><summary>chunk #75 (search rank 10)</summary>

```text
Components of Fiscal 2023 Net Sales growth
Three Months Ended June 30 Twelve Months Ended June 30
($ million) Flexibles Rigid
Packaging Total Flexibles Rigid
Packaging Total
Net sales fiscal year 2023 2,777 897 3,673 11,154 3,540 14,694
Net sales fiscal year 2022 2,967 942 3,909 11,151 3,393 14,544
Reported Growth % (6) (5) (6) — 4 1
FX % 1 (1) — (4) (1) (3)
Constant Currency Growth % (7) (4) (6) 4 5 4
Raw Material Pass Through % 1 — 1 5 8 5
Items affecting comparability % (3) — (2) (2) — (1)
```

</details>

<details><summary>chunk #67 (not in search top 20)</summary>

```text
U.S. GAAP Condensed Consolidated Statements of Income (Unaudited)
Three Months Ended June 30, Twelve Months Ended June 30,
($ million, except per share amounts) 2022 2023 2022 2023
Net sales 3,909 3,673 14,544 14,694
Cost of sales (3,115) (2,951) (11,724) (11,969)
Gross profit 794 722 2,820 2,725
Selling, general, and administrative expenses (342) (329) (1,284) (1,246)
Research and development expenses (24) (25) (96) (101)
```

</details>

<details><summary>chunk #76 (not in search top 20)</summary>

```text
Comparable Constant Currency
Growth % (5) (4) (5) 1 (3) —
Volume % (7) (6) (7) (3) (4) (3)
Price/Mix % 2 2 2 4 1 3
10
```

</details>

**Model answer, top 10:**

> The comparable constant currency growth for Amcor's net sales for the fiscal year 2023 vs. fiscal year 2022 was 1%.

Your grade (top 10): ____

**Model answer, top 15:**

> The comparable constant currency growth for Amcor's net sales for the full fiscal year 2023 versus fiscal year 2022 was 1%.

Your grade (top 15): ____

---

## 79. `nq-0158` (nq, 2018 Australian Grand Prix)

**Question:** who won 2018 formula one australia grand prix tournament

**Reference answer:** Sebastian Vettel was

**Answer chunks:** 2 labelled:

<details><summary>chunk #2 (search rank 1)</summary>

```text
FIA Formula One World Championship.[2] The
race marked the eighty-second race in the
combined history of the Australian Grand Prix
—which dates back to the 100 Miles Road Race
of 1928—and the twenty-third time the event
was held at the Albert Park circuit.
Ferrari driver Sebastian Vettel was the
defending race winner.[3] Lewis Hamilton
started the race from pole—his seventh pole
position in Australia,[4] a record for the event—
while Vettel successfully defended his race win,
```

</details>

<details><summary>chunk #3 (not in search top 20)</summary>

```text
while Vettel successfully defended his race win,
the forty-eighth of his career.[3]
The race marked the competitive début of the
"halo" cockpit protection device after eighteen
months of rigorous testing.[5]
This is an old revision of this page, as edited by Jim1138 (talk | contribs) at 05:24, 22 May 2018
(Reverted edits by 2600:1700:CCE1:D00:28A7:9C3F:A350:627E (talk): not providing a reliable
source (WP:CITE, WP:RS) (HG) (3.3.5)). The present address (URL) is a permanent link to
```

</details>

**Model answer, top 10:**

> Sebastian Vettel won the 2018 Formula One Australian Grand Prix tournament.

Your grade (top 10): ____

**Model answer, top 15:**

> Sebastian Vettel won the 2018 Formula One Australian Grand Prix tournament.

Your grade (top 15): ____

---

## 80. `tat-0641` (tat, cal-maine-foods-inc_2019)

**Question:** What is the increase / (decrease) in the Net income (loss) attributable to Cal-Maine Foods, Inc. available for dividend in 2019 compared to 2018?

**Reference answer:** -138.54

**Answer chunks:** 2 labelled:

<details><summary>chunk #382 (search rank 1)</summary>

```text
at beginning of the period — (20,488) — (74,653)
Net income (loss) attributable to Cal-Maine Foods, Inc. available
for dividend $ (19,761) $ 51,279 $ 54,229 $ 51,279
1/3 of net income attributable to Cal-Maine Foods, Inc. —
Common stock outstanding (shares) 43,894
Class A common stock outstanding (shares) 4,800
Total common stock outstanding (shares) 48,694
Dividends per common share* $ — $ 0.351 $ 0.506 $ 0.351
```

</details>

<details><summary>chunk #381 (search rank 2)</summary>

```text
represent accrued unpaid dividends applicable to the Company's fourth quarter, were zero at June 1, 2019 and $17.1
million at June 2, 2018. At June 1, 2019, cumulative losses that must be recovered prior to paying a dividend were
$19.8 million.
13 Weeks Ended 52 Weeks Ended
June 1,
2019 June 2,
2018 June 1,
2019 June 2,
2018
Net income (loss) attributable to Cal-Maine Foods, inc. $ (19,761) $ 71,767 $ 54,229 $ 125,932
Cumulative losses to be recovered prior to payment of dividend
```

</details>

**Model answer, top 10:**

> The Net income (loss) attributable to Cal-Maine Foods, Inc. available for dividend in 2019 was $54,229 compared to $51,279 in 2018. Therefore, the increase is $2,950.

Your grade (top 10): ____

**Model answer, top 15:**

> The Net income (loss) attributable to Cal-Maine Foods, Inc. available for dividend in 2019 was $54,229 compared to $51,279 in 2018. Therefore, the increase is $2,950.

Your grade (top 15): ____

---

## 81. `financebench-0024` (financebench, AMCOR_2023_10K)

**Question:** What are major acquisitions that AMCOR has done in FY2023, FY2022 and FY2021?

**Reference answer:** Amcor completed these acquisitions during FY2023:
-100% equity interest of a flexibles manufacturing company in the Czech Republic

- 100% equity interest in a medical device packaging manufacturing site in
  Shanghai, China.
  -acquisition of a New Zealand-based leading manufacturer of state-of-the-art, automated protein
  packaging machines.

**Answer chunks:** 7 labelled, showing the 5 search ranked highest:

<details><summary>chunk #521 (not in search top 20)</summary>

```text
Note 5 - Acquisitions and Divestitures
Year ended June 30, 2023
Acquisitions
On August 1, 2022, the Company completed the acquisition of 100% equity interest in a Czech Republic company that operates a world-class
flexible packaging manufacturing plant. The purchase consideration of $59 million included a deferred portion of $5 million that was paid in the
```

</details>

<details><summary>chunk #522 (not in search top 20)</summary>

```text
first quarter of fiscal year 2024. The acquisition is part of the Company's Flexibles reportable segment and resulted in the recognition of acquired
identifiable net assets of $36 million and goodwill of $23 million. Goodwill is not deductible for tax purposes. The fair values of the identifiable
net assets acquired and goodwill are based on the Company's best estimate as of June 30, 2023.
```

</details>

<details><summary>chunk #523 (not in search top 20)</summary>

```text
On March 17, 2023, the Company completed the acquisition of 100% equity interest in a medical device packaging manufacturing site in
Shanghai, China. The purchase consideration of $60 million is subject to customary post-closing adjustments. The consideration includes
contingent consideration of $20 million, to be earned and paid in cash over the three years following the acquisition date, subject to meeting
```

</details>

<details><summary>chunk #524 (not in search top 20)</summary>

```text
certain performance targets. The acquisition is part of the Company's Flexibles reportable segment and resulted in the recognition of acquired
identifiable net assets of $21 million and goodwill of $39 million. Goodwill is not deductible for tax purposes. The fair values of the contingent
consideration, identifiable net assets acquired, and goodwill are based on the Company's best estimate as of June 30, 2023, and are considered
```

</details>

<details><summary>chunk #525 (not in search top 20)</summary>

```text
preliminary. The Company aims to complete the purchase price allocation as soon as practicable but no later than one year from the date of the
acquisition.
On May 31, 2023, the Company completed the acquisition of a New Zealand based leading manufacturer of state-of-the-art, automated protein
packaging machines. The purchase consideration of $45 million is subject to customary post-closing adjustments. The consideration includes
```

</details>

**Model answer, top 10:**

> The provided context is insufficient to answer this question.

Your grade (top 10): ____

**Model answer, top 15:**

> The provided context is insufficient to answer this question.

Your grade (top 15): ____

---

## 82. `financebench-0071` (financebench, CORNING_2021_10K)

**Question:** Taking into account the information outlined in the income statement, what is the FY2019 - FY2021 3 year average unadjusted operating income % margin for Corning? Answer in units of percents and round to one decimal place.

**Reference answer:** 10.3%

**Answer chunks:** 6 labelled, showing the 5 search ranked highest:

<details><summary>chunk #588 (search rank 1)</summary>

```text
Table of Contents
Consolidated Statements of Income Corning Incorporated and Subsidiary Companies
Year ended December 31,
(In millions, except per share amounts) 2021 2020 2019
Net sales $ 14,082 $ 11,303 $ 11,503
Cost of sales 9,019 7,772 7,468
Gross margin 5,063 3,531 4,035
Operating expenses:
Selling, general and administrative expenses 1,827 1,747 1,585
Research, development and engineering expenses 995 1,154 1,031
Amortization of purchased intangibles 129 121 113
```

</details>

<details><summary>chunk #590 (search rank 16)</summary>

```text
Net income attributable to Corning Incorporated $ 1,906 $ 512 $ 960
Earnings per common share attributable to Corning Incorporated:
Basic (Note 18) $ 1.30 $ 0.54 $ 1.11
Diluted (Note 18) $ 1.28 $ 0.54 $ 1.07
Reconciliation of net income attributable to Corning Incorporated versus net income available to common
shareholders:
Net income attributable to Corning Incorporated $ 1,906 $ 512 $ 960
Series A convertible preferred stock dividend (24) (98) (98)
```

</details>

<details><summary>chunk #245 (not in search top 20)</summary>

```text
Table of Contents
RESULTS OF OPERATIONS
Selected highlights from our operations follow (in millions):
Year ended December 31, % change
2021 2020 2019 21 vs. 20 20 vs. 19
Net sales $ 14,082 $ 11,303 $ 11,503 25 (2)
Gross margin $ 5,063 $ 3,531 $ 4,035 43 (12)
(gross margin %) 36% 31% 35%
Selling, general and administrative expenses $ 1,827 $ 1,747 $ 1,585 5 10
(as a % of net sales) 13% 15% 14%
Research, development and engineering expenses $ 995 $ 1,154 $ 1,031 (14) 12
```

</details>

<details><summary>chunk #273 (not in search top 20)</summary>

```text
Net income available to common shareholders used in basic earnings per common share
calculation $ 1,079 $ 414 $ 862
Net income available to common shareholders used in diluted earnings per common share
calculation $ 1,079 $ 414 $ 960
Basic earnings per common share $ 1.30 $ 0.54 $ 1.11
Diluted earnings per common share $ 1.28 $ 0.54 $ 1.07
Weighted-average common shares outstanding - basic 828 761 776
Weighted-average common shares outstanding - diluted 844 772 899
```

</details>

<details><summary>chunk #589 (not in search top 20)</summary>

```text
Amortization of purchased intangibles 129 121 113
Operating income 2,112 509 1,306
Equity in earnings (losses) of affiliated companies (Note 3) 35 (25) 17
Interest income 11 15 21
Interest expense (300) (276) (221)
Translated earnings contract gain (loss), net (Note 15) 354 (38) 248
Transaction-related gain, net (Note 4) 498
Other income (expense), net 185 (60) (155)
Income before income taxes 2,397 623 1,216
Provision for income taxes (Note 8) (491) (111) (256)
```

</details>

**Model answer, top 10:**

> The provided context is insufficient to answer this question.

Your grade (top 10): ____

**Model answer, top 15:**

> The provided context is insufficient to answer this question.

Your grade (top 15): ____

---

## 83. `nq-0280` (nq, List of UFC champions)

**Question:** who has the light heavyweight belt in ufc

**Reference answer:** Daniel Cormier

**Answer chunks:** 1 labelled:

<details><summary>chunk #7 (not in search top 20)</summary>

```text
Men[13]
Division Champion Since Defenses
Heavyweight Stipe Miocic May 14, 2016 2
Light Heavyweight Daniel Cormier May 23, 2015 2
Middleweight
Michael Bisping Jun 4, 2016 1
Robert Whittaker
(Interim champion) Jul 8, 2017 0
Welterweight Tyron Woodley Jul 30, 2016 3
Lightweight
Conor McGregor Nov 12, 2016 0
Tony Ferguson
(Interim champion) Oct 7, 2017 0
Featherweight Max Holloway Jun 3, 2017 0
Bantamweight Cody Garbrandt Dec 30, 2016 0
Flyweight Demetrious Johnson Sep 22, 2012 11
```

</details>

**Model answer, top 10:**

> The current light heavyweight champion is Stipe Miocic.

Your grade (top 10): ____

**Model answer, top 15:**

> The current light heavyweight champion is Stipe Miocic.

Your grade (top 15): ____

---

## 84. `financebench-0148` (financebench, WALMART_2019_10K)

**Question:** Based on the information provided primarily in the statement of income, what is the FY2018 - FY2019 change in unadjusted operating income % margin for Walmart? Answer in units of percents and round to one decimal place.

**Reference answer:** 0.2%

**Answer chunks:** 5 labelled:

<details><summary>chunk #525 (search rank 7)</summary>

```text
Walmart Inc.
Consolidated Statements of Income
Fiscal Years Ended January 31,
(Amounts in millions, except per share data) 2019 2018 2017
Revenues:
Net sales $ 510,329 $ 495,761 $ 481,317
Membership and other income 4,076 4,582 4,556
Total revenues 514,405 500,343 485,873
Costs and expenses:
Cost of sales 385,301 373,396 361,256
Operating, selling, general and administrative expenses 107,147 106,510 101,853
Operating income 21,957 20,437 22,764
Interest:
Debt 1,975 1,978 2,044
```

</details>

<details><summary>chunk #312 (not in search top 20)</summary>

```text
Operating results
Total revenues $ 514,405 $ 500,343 $ 485,873 $ 482,130 $ 485,651
Percentage change in total revenues from previous fiscal year 2.8% 3.0% 0.8% (0.7)% 2.0%
Net sales $ 510,329 $ 495,761 $ 481,317 $ 478,614 $ 482,229
Percentage change in net sales from previous fiscal year 2.9% 3.0% 0.6% (0.7)% 1.9%
Increase (decrease) in calendar comparable sales (1) in the U.S. 4.0% 2.2% 1.4% 0.3 % 0.5%
Walmart U.S. 3.7% 2.1% 1.6% 1.0 % 0.6%
Sam's Club 5.4% 2.8% 0.5% (3.2)% 0.0%
```

</details>

<details><summary>chunk #374 (not in search top 20)</summary>

```text
Net sales $ 510,329 $ 495,761 $ 481,317
Percentage change from comparable period 2.9% 3.0% 0.6%
Total U.S. calendar comparable sales increase 4.0% 2.2% 1.4%
Gross profit rate 24.5% 24.7% 24.9%
Operating income $ 21,957 $ 20,437 $ 22,764
Operating income as a percentage of net sales 4.3% 4.1% 4.7%
Consolidated net income $ 7,179 $ 10,523 $ 14,293
Unit counts at period end 11,361 11,718 11,695
Retail square feet at period end 1,129 1,158 1,164
```

</details>

<details><summary>chunk #526 (not in search top 20)</summary>

```text
Interest:
Debt 1,975 1,978 2,044
Capital lease and financing obligations 371 352 323
Interest income (217) (152) (100)
Interest, net 2,129 2,178 2,267
Loss on extinguishment of debt — 3,136 —
Other (gains) and losses 8,368 — —
Income before income taxes 11,460 15,123 20,497
Provision for income taxes 4,281 4,600 6,204
Consolidated net income 7,179 10,523 14,293
Consolidated net income attributable to noncontrolling interest (509) (661) (650)
```

</details>

<details><summary>chunk #527 (not in search top 20)</summary>

```text
Consolidated net income attributable to Walmart $ 6,670 $ 9,862 $ 13,643
Net income per common share:
Basic net income per common share attributable to Walmart $ 2.28 $ 3.29 $ 4.40
Diluted net income per common share attributable to Walmart 2.26 3.28 4.38
Weighted-average common shares outstanding:
Basic 2,929 2,995 3,101
Diluted 2,945 3,010 3,112
Dividends declared per common share $ 2.08 $ 2.04 $ 2.00
See accompanying notes.
48
```

</details>

**Model answer, top 10:**

> The FY2018 - FY2019 change in unadjusted operating income % margin for Walmart is -0.1%.

Your grade (top 10): ____

**Model answer, top 15:**

> The operating income as a percentage of net sales for Walmart U.S. was 5.3% for fiscal 2018 and 5.2% for fiscal 2019. The change in unadjusted operating income % margin for Walmart from FY2018 to FY2019 is -0.1%.

Your grade (top 15): ____

---

## 85. `feta-0476` (feta, John Matuszak)

**Question:** What were John Matuszak's first two movie roles?

**Reference answer:** John Matuszak starred as Tonda in Caveman (1981) and in the movie North Dallas Forty (1979).

**Answer chunks:** 2 labelled:

<details><summary>chunk #2 (search rank 2)</summary>

```text
until he retired after winning his second Super Bowl in
1981. Matuszak participated in the 1978 World's
Strongest Man competition, where he placed ninth. As
an actor, he played in both films and television,
appearing first as O.W. Shaddock in 1979 in North
Dallas Forty followed by Tonda in the 1981 film
Caveman. His best known role was as the deformed
Sloth in the 1985 movie The Goonies. His biography,
Cruisin' with the Tooz, written with Steve Delsohn, was
published in 1987.
```

</details>

<details><summary>chunk #13 (search rank 3)</summary>

```text
years old. The report also said that hypertrophic cardiomyopathy (an enlarged heart) and bronchopneumonia had
been contributing factors in his death. There were also traces of cocaine found in his blood stream.[10]
Film
Year Title Role Notes
1979 North Dallas Forty O.W. Shaddock
1981 Caveman Tonda
1984 The Ice Pirates Killjoy
1985 The Goonies Sloth Fratelli
1986 One Crazy Summer Stain
1987 P.K. and the Kid Himself
1989 Ghost Writer Jake
1989 The Princess and the Dwarf
1989 One Man Force Jake
```

</details>

**Model answer, top 10:**

> John Matuszak's first two movie roles were as O.W. Shaddock in "North Dallas Forty" (1979) and as Tonda in "Caveman" (1981).

Your grade (top 10): ____

**Model answer, top 15:**

> John Matuszak's first two movie roles were O.W. Shaddock in 1979 in North Dallas Forty and Tonda in the 1981 film Caveman.

Your grade (top 15): ____

---

## 86. `financebench-0080` (financebench, FOOTLOCKER_2022_8K_dated-2022-05-20)

**Question:** Were there any board member nominees who had substantially more votes against joining than the other nominees?

**Reference answer:** Yes, his name is Richard A. Johnson

**Answer chunks:** 5 labelled:

<details><summary>chunk #7 (search rank 1)</summary>

```text
Proposal 1. With respect to the proposal to elect ten nominees to the Board of Directors (the “Board”), each for a one-year term expiring at the
annual meeting of shareholders to be held in 2023, the votes were cast for the proposal as set forth below:
Name Votes For Votes Against Abstentions Broker Non-Votes
Virginia C. Drosos 59,657,810 294,935 10,714,238 6,884,223
Alan D. Feldman 54,760,830 5,184,437 10,721,716 6,884,223
Richard A. Johnson 54,484,293 16,105,005 77,685 6,884,223
```

</details>

<details><summary>chunk #9 (search rank 2)</summary>

```text
Based on the votes set forth above, each of the ten nominees to the Board was duly elected.
Proposal 2. With respect to the proposal to approve, on an advisory basis, the Company’s named executive officers’ (“NEOs”) compensation, the
votes were cast for the proposal as set forth below:
Votes For Votes Against Abstentions Broker Non-Votes
57,172,731 13,324,080 170,172 6,884,223
Based on the votes set forth above, the NEOs’ compensation was approved.
```

</details>

<details><summary>chunk #11 (search rank 3)</summary>

```text
proxy materials until the next required frequency vote, which is expected to be held at the annual meeting of shareholders to be held in 2028.
Proposal 4. With respect to the proposal to ratify the appointment of KPMG LLP as the Company’s independent registered public accounting firm
for the 2022 fiscal year, the votes were cast for the proposal as set forth below:
Votes For Votes Against Abstentions
75,612,318 1,854,695 84,193
```

</details>

<details><summary>chunk #10 (search rank 4)</summary>

```text
Proposal 3. With respect to the proposal, on an advisory basis, whether the shareholder vote to approve the NEOs’ compensation should occur
every 1, 2, or 3 years, the votes were cast for the proposal as set forth below:
Votes For
1 Year
Votes For
2 Years
Votes For
3 Years Abstentions Broker Non-Votes
66,076,265 43,060 4,352,683 194,975 6,884,223
Based on the votes set forth above, the Company will include an annual advisory shareholder vote to approve the NEOs’ compensation in its
```

</details>

<details><summary>chunk #8 (search rank 10)</summary>

```text
Guillermo G. Marmol 54,193,921 5,753,395 10,719,667 6,884,223
Darlene Nicosia 55,123,930 4,827,808 10,715,245 6,884,223
Steven Oakland 55,421,657 4,524,393 10,720,933 6,884,223
Ulice Payne, Jr. 54,993,396 4,950,917 10,722,670 6,884,223
Kimberly Underhill 55,046,260 4,906,500 10,714,223 6,884,223
Tristan Walker 55,528,794 4,419,340 10,718,849 6,884,223
Dona D. Young 53,876,257 6,074,467 10,716,259 6,884,223
```

</details>

**Model answer, top 10:**

> Yes, Richard A. Johnson had substantially more votes against joining than the other nominees. He received 16,105,005 votes against, which is significantly higher than the votes against for the other nominees.

Your grade (top 10): ____

**Model answer, top 15:**

> Yes, some board member nominees had substantially more votes against joining than others. For example, Richard A. Johnson had 16,105,005 votes against, which is significantly higher than the votes against other nominees. Similarly, Dona D. Young had 6,074,467 votes against, which is also substantially higher than the votes against other nominees.

Your grade (top 15): ____

---

## 87. `financebench-0074` (financebench, COSTCO_2021_10K)

**Question:** Using only the information within the balance sheet, how much total assets did Costco have at the end of FY2021? Answer in USD millions.

**Reference answer:** $59268.00

**Answer chunks:** 13 labelled, showing the 5 search ranked highest:

<details><summary>chunk #283 (search rank 1)</summary>

```text
Table of Contents
COSTCO WHOLESALE CORPORATION
CONSOLIDATED BALANCE SHEETS
(amounts in millions, except par value and share data)
August 29,
2021 August 30,
2020
ASSETS
CURRENT ASSETS
Cash and cash equivalents $ 11,258 $ 12,277
Short-term investments 917 1,028
Receivables, net 1,803 1,550
Merchandise inventories 14,215 12,242
Other current assets 1,312 1,023
Total current assets 29,505 28,120
OTHER ASSETS
Property and equipment, net 23,492 21,807
Operating lease right-of-use assets 2,890 2,788
```

</details>

<details><summary>chunk #286 (search rank 3)</summary>

```text
Retained earnings 11,666 12,879
Total Costco stockholders’ equity 17,564 18,284
Noncontrolling interests 514 421
TOTAL EQUITY 18,078 18,705
TOTAL LIABILITIES AND EQUITY $ 59,268 $ 55,556
The accompanying notes are an integral part of these consolidated financial statements.
38
```

</details>

<details><summary>chunk #292 (search rank 6)</summary>

```text
Table of Contents
COSTCO WHOLESALE CORPORATION
CONSOLIDATED STATEMENTS OF CASH FLOWS
(amounts in millions)
52 Weeks Ended 52 Weeks Ended 52 Weeks Ended
August 29,
2021 August 30,
2020 September 1,
2019
CASH FLOWS FROM OPERATING ACTIVITIES
Net income including noncontrolling interests $ 5,079 $ 4,059 $ 3,704
Adjustments to reconcile net income including noncontrolling interests to net cash provided by
operating activities:
Depreciation and amortization 1,781 1,645 1,492
```

</details>

<details><summary>chunk #280 (search rank 7)</summary>

```text
COSTCO:
Basic $ 11.30 $ 9.05 $ 8.32
Diluted $ 11.27 $ 9.02 $ 8.26
Shares used in calculation (000’s)
Basic 443,089 442,297 439,755
Diluted 444,346 443,901 442,923
The accompanying notes are an integral part of these consolidated financial statements.
36
```

</details>

<details><summary>chunk #281 (search rank 9)</summary>

```text
Table of Contents
COSTCO WHOLESALE CORPORATION
CONSOLIDATED STATEMENTS OF COMPREHENSIVE INCOME
(amounts in millions)
52 Weeks Ended 52 Weeks Ended 52 Weeks Ended
August 29,
2021
August 30,
2020
September 1,
2019
NET INCOME INCLUDING NONCONTROLLING INTERESTS $ 5,079 $ 4,059 $ 3,704
Foreign-currency translation adjustment and other, net 181 162 (245)
Comprehensive income 5,260 4,221 3,459
Less: Comprehensive income attributable to noncontrolling
interests 93 80 37
```

</details>

**Model answer, top 10:**

> $59,268

Your grade (top 10): ____

**Model answer, top 15:**

> $59,268

Your grade (top 15): ____

---

## 88. `nq-0288` (nq, List of districts in India)

**Question:** total number of districts in india in 2018

**Reference answer:** 712 districts

**Answer chunks:** 1 labelled:

<details><summary>chunk #1 (search rank 1)</summary>

```text
Government District Administration
Subdivisions Tehsil, Taluka, Mandal
Blocks
List of districts in India
A district (zilā) is an administrative division of an Indian state or territory. In some cases districts
are further subdivided into sub-divisions, and in others directly into tehsils or talukas. As of 2016
there are a total of 707 districts,[1] up from the 640 in the 2011 Census of India[2] and the 593
recorded in the 2001 Census of India.[3]
District officials include:
```

</details>

**Model answer, top 10:**

> The provided context is insufficient to answer this question.

Your grade (top 10): ____

**Model answer, top 15:**

> The provided context is insufficient to answer this question.

Your grade (top 15): ____

---

## 89. `nq-0246` (nq, Kaley Cuoco)

**Question:** who plays penny on the big bang theory

**Reference answer:** Kaley Christine Cuoco (

**Answer chunks:** 3 labelled:

<details><summary>chunk #1 (search rank 2)</summary>

```text
Rules, on which she starred from 2002 to 2005. Thereafter, Cuoco
appeared as Billie Jenkins on the final season of the television series
Charmed (2005–2006). Since 2007, she has starred as Penny on the CBS
sitcom The Big Bang Theory, for which she has received Satellite,
Critics' Choice, and People's Choice Awards. Cuoco's film work includes
roles in To Be Fat like Me (2007), Hop (2011) and Authors Anonymous
(2014). She received a star on the Hollywood Walk of Fame in 2014.[2]
```

</details>

<details><summary>chunk #0 (search rank 15)</summary>

```text
Kaley Cuoco
Cuoco in July 2017
Born Kaley Christine
Cuoco
November 30, 1985
Camarillo, California,
U.S.
Other names Kaley Cuoco-
Sweeting
Occupation Actress
Years active 1992–present
Spouse Ryan Sweeting
(m. 2013; div. 2016)
Kaley Cuoco
Kaley Christine Cuoco (/ˈkeɪli ˈkwoʊkoʊ/ KAY-lee KWOH-koh; born
November 30, 1985)[1] is an American actress. After a series of
supporting film and television roles in the late 1990s, she landed her
breakthrough role as Bridget Hennessy on the ABC sitcom 8 Simple
```

</details>

<details><summary>chunk #4 (search rank 19)</summary>

```text
as Bridget Hennessy on the ABC sitcom 8 Simple Rules. Bridget was the
oldest child, despite Cuoco being six years younger than Amy Davidson, who played her younger sister.
Because of low ratings, ABC canceled the series on May 17, 2005.
This is an old revision of this page, as edited by KolbertBot (talk | contribs) at 07:02, 2
September 2017 (Bot: HTTP→HTTPS). The present address (URL) is a permanent link to this
revision, which may differ significantly from the current revision.
Early life
```

</details>

**Model answer, top 10:**

> Kaley Cuoco plays Penny on The Big Bang Theory.

Your grade (top 10): ____

**Model answer, top 15:**

> Kaley Cuoco plays Penny on The Big Bang Theory.

Your grade (top 15): ____

---

## 90. `nq-0245` (nq, Kaley Cuoco)

**Question:** actress that plays penny on big bang theory

**Reference answer:** Kaley Christine Cuoco (

**Answer chunks:** 3 labelled:

<details><summary>chunk #1 (search rank 2)</summary>

```text
Rules, on which she starred from 2002 to 2005. Thereafter, Cuoco
appeared as Billie Jenkins on the final season of the television series
Charmed (2005–2006). Since 2007, she has starred as Penny on the CBS
sitcom The Big Bang Theory, for which she has received Satellite,
Critics' Choice, and People's Choice Awards. Cuoco's film work includes
roles in To Be Fat like Me (2007), Hop (2011) and Authors Anonymous
(2014). She received a star on the Hollywood Walk of Fame in 2014.[2]
```

</details>

<details><summary>chunk #0 (search rank 13)</summary>

```text
Kaley Cuoco
Cuoco in July 2017
Born Kaley Christine
Cuoco
November 30, 1985
Camarillo, California,
U.S.
Other names Kaley Cuoco-
Sweeting
Occupation Actress
Years active 1992–present
Spouse Ryan Sweeting
(m. 2013; div. 2016)
Kaley Cuoco
Kaley Christine Cuoco (/ˈkeɪli ˈkwoʊkoʊ/ KAY-lee KWOH-koh; born
November 30, 1985)[1] is an American actress. After a series of
supporting film and television roles in the late 1990s, she landed her
breakthrough role as Bridget Hennessy on the ABC sitcom 8 Simple
```

</details>

<details><summary>chunk #4 (not in search top 20)</summary>

```text
as Bridget Hennessy on the ABC sitcom 8 Simple Rules. Bridget was the
oldest child, despite Cuoco being six years younger than Amy Davidson, who played her younger sister.
Because of low ratings, ABC canceled the series on May 17, 2005.
This is an old revision of this page, as edited by KolbertBot (talk | contribs) at 07:02, 2
September 2017 (Bot: HTTP→HTTPS). The present address (URL) is a permanent link to this
revision, which may differ significantly from the current revision.
Early life
```

</details>

**Model answer, top 10:**

> The actress that plays Penny on The Big Bang Theory is Kaley Cuoco.

Your grade (top 10): ____

**Model answer, top 15:**

> The actress that plays Penny on The Big Bang Theory is Kaley Cuoco.

Your grade (top 15): ____

---

## 91. `feta-0590` (feta, The Lion King (musical))

**Question:** What Tony awards did the Lion King win?

**Reference answer:** The Lion King earned six Tony Awards, one for Best Musical and Julie Taymor won for Best Direction of a Musical.

**Answer chunks:** 5 labelled:

<details><summary>chunk #102 (search rank 1)</summary>

```text
Outstanding Set Design Richard Hudson Won
Outstanding Costume Design Julie Taymor Won
Outstanding Lighting Design Donald Holder Won
Outstanding Sound Design Tony Meola Won
Outstanding Puppet Design Julie Taymor and Michael Curry Won
Theatre World Awards Max Casella Won
Tony Awards
Best Musical Won
Best Book of a Musical Roger Allers and Irene Mecchi Nominated
Best Original Score Elton John, Tim Rice, Hans Zimmer, Lebo M,
Mark Mancina, Jay Rifkin and Julie Taymor Nominated
```

</details>

<details><summary>chunk #4 (search rank 4)</summary>

```text
Broadway production of all time.[5][6] Over 95 million people worldwide have seen the musical and it has earned
numerous awards and honors, including six Tony Awards, one for Best Musical and Best Direction of a Musical,
making director Julie Taymor the first woman to earn such an honor.[7]
The show opened in the West End's Lyceum Theatre on October 19, 1999, and is still running after more than 7,500
```

</details>

<details><summary>chunk #103 (search rank 5)</summary>

```text
Best Performance by a Featured Actor in a Musical Samuel E. Wright Nominated
Best Performance by a Featured Actress in a Musical Tsidii Le Loka Nominated
Best Direction of a Musical Julie Taymor Won
Best Choreography Garth Fagan Won
Best Orchestrations Robert Elhai, David Metzger and Bruce Fowler Nominated
Best Scenic Design Richard Hudson Won
Best Costume Design Julie Taymor and Michael Curry Won
Best Lighting Design Donald Holder Won
Year Award Ceremony Category Nominee Result
```

</details>

<details><summary>chunk #105 (search rank 6)</summary>

```text
2008 Molière Awards
Best Musical Won
Best Costume Design Julie Taymor Won
Best Lighting Design Donald Holder Won
1. Steven., Suskin, (2011). The sound of Broadway music : a book of
orchestrators and orchestrations (https://www.worldcat.org/oclc/7004067
79). Oxford: Oxford University Press. p. 595. ISBN 0199790841.
OCLC 700406779 (https://search.worldcat.org/oclc/700406779).
Awards and nominations
Original Broadway production
Original London production
Original France production
References
```

</details>

<details><summary>chunk #104 (search rank 7)</summary>

```text
Year Award Ceremony Category Nominee Result
1999 Laurence Olivier Awards
Best New Musical Nominated
Best Actor in a Musical Rob Edwards Nominated
Best Actress in a Musical Josette Bushell-Mingo Nominated
Best Director Julie Taymor Nominated
Best Theatre Choreographer Garth Fagan Won
Best Set Design Richard Hudson Nominated
Best Costume Design Julie Taymor Won
Best Lighting Design Donald Holder Nominated
Year Award Ceremony Category Nominee Result
2008 Molière Awards
Best Musical Won
```

</details>

**Model answer, top 10:**

> The Lion King won the following Tony Awards: Best Musical, Best Scenic Design, Tony Award for Best Costume Design, Tony Award for Best Lighting Design, Tony Award for Best Choreography, and Tony Award for Best Direction of a Musical.

Your grade (top 10): ____

**Model answer, top 15:**

> The Lion King won the Tony Award for Best Musical, the Tony Award for Best Book of a Musical, the Tony Award for Best Direction of a Musical, the Tony Award for Best Choreography, the Tony Award for Best Scenic Design, the Tony Award for Best Costume Design, and the Tony Award for Best Lighting Design.

Your grade (top 15): ____

---

## 92. `feta-0534` (feta, Matt Cassel)

**Question:** How many seasons did Matt Cassel play at USC, and what were his overall totals for completions, attempts, yards, touchdowns and interceptions?

**Reference answer:** During his four seasons at USC, Cassel completed 20-of-33 passes for 192 yards with no touchdowns and one interception.

**Answer chunks:** 1 labelled:

<details><summary>chunk #12 (search rank 2)</summary>

```text
2001 USC Trojans 7 1 2 50.0 5 2.5 0 0 NA 3 22 0
2002 USC Trojans 10 3 4 75.0 27 6.8 0 0 132 1 1 0
2003 USC Trojans 8 6 13 46.2 63 4.8 0 0 87 1 -2 0
2004 USC Trojans 9 10 14 71.4 97 6.9 0 1 115 6 11 0
Total 32 20 33 61 192 5.8 0 1 103 11 32 0
Source:sports-reference.com (https://www.sports-reference.com/cfb/players/matt-cassel-1.html)
Pre-draft measurables
Height Weight 40-yard dash 20-yard shuttle Three-cone drill Vertical jump Broad jump
6 ft 43⁄8 in
(1.94 m)
222 lb
```

</details>

**Model answer, top 10:**

> Matt Cassel played four seasons at USC. His overall totals were 20 completions, 33 attempts, 192 yards, 0 touchdowns, and 1 interception.

Your grade (top 10): ____

**Model answer, top 15:**

> Matt Cassel played four seasons at USC. His overall totals were 20 completions, 33 attempts, 192 yards, 0 touchdowns, and 1 interception.

Your grade (top 15): ____

---

## 93. `feta-0557` (feta, Port Adelaide Football Club)

**Question:** When did Fos Williams play premiership at Adelaide Oval, and how many people did he play in front of?

**Reference answer:** In 1965, Fos Williams played premiership in-front of 62,543 people at Adelaide Oval.

**Answer chunks:** 1 labelled:

<details><summary>chunk #45 (search rank 2)</summary>

```text
Fos Williams coached Port
Adelaide to nine premierships
1957 SANFL Grand Final G B Total
Port Adelaide 15 15 105
Norwood 13 16 94
Venue: Adelaide Oval Crowd: 58,924
1965 SANFL Grand Final
Fos Williams ninth premiership. G B Total
Port Adelaide 12 8 80
Sturt 12 5 77
Venue: Adelaide Oval Crowd: 62,543[46]
Statue of Russell Ebert
outside Adelaide Oval.
1977 SANFL Grand Final G B Total
Port Adelaide 17 11 113
Glenelg 16 9 105
Venue: Football Park Crowd: 56,717[48]
```

</details>

**Model answer, top 10:**

> Fos Williams coached Port Adelaide to nine premierships. In the 1965 SANFL Grand Final, he coached Port Adelaide in front of 62,543 people at Adelaide Oval.

Your grade (top 10): ____

**Model answer, top 15:**

> Fos Williams played in a premiership at Adelaide Oval in 1965, in front of 62,543 people.

Your grade (top 15): ____

---

## 94. `nq-0206` (nq, Emma Chambers)

**Question:** who plays alice in the vicar of dibley

**Reference answer:** Emma G.M. Chambers (

**Answer chunks:** 3 labelled:

<details><summary>chunk #0 (search rank 1)</summary>

```text
Emma Chambers
Born Emma G. M.
Chambers
11 March 1964[1]
Doncaster, West
Riding of
Yorkshire,[1]
England
Other names Nicola Chambers
Occupation Actress
Years active 1988–2007
Known for Role of Alice Tinker
Notable work Alice Tinker in The
Vicar of Dibley
Television The Vicar of Dibley
(1994–2007)
Spouse Ian Dunn (m. 1991)
Emma Chambers
Emma G. M. Chambers (born 11 March 1964) is an English actress.
She is best known for playing the role of Alice Tinker in the BBC
```

</details>

<details><summary>chunk #2 (search rank 2)</summary>

```text
Bill, in November 1994 Chambers played the role of Charity Pecksniff
in the TV serialisation of the Charles Dickens novel Martin Chuzzlewit.
From 1994 to 2007 she played the role of Alice Tinker in the BBC
comedy The Vicar of Dibley. Chambers appeared in all 20 episodes and four Comic Relief specials until 2007.
She did not appear in the two most recent Comic Relief specials, in 2013 and 2015. In 1998, Chambers won the
British Comedy Award for Best Actress for her performance.
```

</details>

<details><summary>chunk #1 (search rank 3)</summary>

```text
comedy The Vicar of Dibley and Honey Thacker in the film Notting
Hill.[2]
Chambers was born in Doncaster, where she went to school at St.
Mary's. Her secondary education was at St Swithun's School,
Winchester, Hampshire. She then trained at the Webber Douglas
Academy of Dramatic Art in the 1980s, where she was a classmate of
actor Ross Kemp. Her sister is Sarah Doukas of Storm Model
Management.[3]
After taking some smaller parts on television productions such as The
```

</details>

**Model answer, top 10:**

> Emma Chambers plays Alice in The Vicar of Dibley.

Your grade (top 10): ____

**Model answer, top 15:**

> Emma Chambers plays Alice in The Vicar of Dibley.

Your grade (top 15): ____

---

## 95. `tat-0629` (tat, altium-limited_2019)

**Question:** What is the percentage increase in other payables from 2018 to 2019?

**Reference answer:** 25.4

**Answer chunks:** 1 labelled:

<details><summary>chunk #340 (search rank 1)</summary>

```text
USA to fully realise these temporary differences.
Consolidated
2019
US$’000
2018
US$’000
Trade payables 3,492 2,016
Deferred consideration 888 643
Other payables 11,898 9,488
16,278 12,147
Accounting policy for trade and other payables
These amounts represent liabilities for goods and services provided to the Group prior to the end of the financial year and which are
```

</details>

**Model answer, top 10:**

> The percentage increase in other payables from 2018 to 2019 is 163.4%.

Your grade (top 10): ____

**Model answer, top 15:**

> The percentage increase in other payables from 2018 to 2019 cannot be directly calculated from the provided context.

Your grade (top 15): ____

---

## 96. `financebench-0133` (financebench, Pfizer_2023Q2_10Q)

**Question:** How much does Pfizer expect to pay to spin off Upjohn in the future in USD million?

**Reference answer:** 77.78

**Answer chunks:** 1 labelled:

<details><summary>chunk #349 (search rank 6)</summary>

```text
Biopharma is the only reportable segment. See Note 13A.
We expect to incur costs of approximately $700 million in connection with separating Upjohn, of which approximately 90% has been incurred since inception
and through the second quarter of 2023. These charges include costs and expenses related to separation of legal entities and transaction costs.
```

</details>

**Model answer, top 10:**

> The provided context is insufficient to answer this question.

Your grade (top 10): ____

**Model answer, top 15:**

> The provided context is insufficient to answer this question.

Your grade (top 15): ____

---

## 97. `feta-0415` (feta, Dancing with the Stars (U.S. season 24))

**Question:** What are Normani Kordei and David Ross known for, who were their partners, and what place did each finish?

**Reference answer:** Former MLB catcher David Ross and Lindsay Arnold finished second, while Fifth Harmony singer Normani Kordei and Val Chmerkovskiy finished third.

**Answer chunks:** 1 labelled:

<details><summary>chunk #1 (search rank 4)</summary>

```text
first win. Former MLB catcher David Ross and Lindsay Arnold finished second, while Fifth Harmony singer Normani
Kordei and Val Chmerkovskiy finished third.
On February 21, 2017, Maksim Chmerkovskiy and Peta Murgatroyd were announced to be the first two professionals
returning this season. This marks the return of Murgatroyd following her taking off the twenty-third season due to her
pregnancy.[3] In the following days, Lindsay Arnold, Sharna Burgess, Witney Carson, Artem Chigvintsev, Valentin
```

</details>

**Model answer, top 10:**

> Normani Kordei is a Fifth Harmony singer, and David Ross is a former MLB catcher. Normani Kordei's partner was Valentin Chmerkovskiy, and they finished third place. David Ross's partner was Lindsay Arnold, and they finished as the runner-up.

Your grade (top 10): ____

**Model answer, top 15:**

> Normani Kordei is a Fifth Harmony singer, and David Ross is a former MLB catcher. Normani Kordei's partner was Valentin Chmerkovskiy, and they finished third. David Ross's partner was Lindsay Arnold, and they finished as the runner-up.

Your grade (top 15): ____

---

## 98. `nq-0262` (nq, List of Chief Ministers of Nagaland)

**Question:** who will be the chief minister of nagaland in 2018

**Reference answer:** T.R. Zeliang MLA

**Answer chunks:** 7 labelled, showing the 5 search ranked highest:

<details><summary>chunk #3 (search rank 2)</summary>

```text
Since 1963, ten people belonging to seven parties have served as Chief Minister of Nagaland. The first three
belonged to the Naga Nationalist Organisation, including the inaugural officeholder P. Shilu Ao. The current
incumbent is Neiphiu Rio of the Nationalist Democratic Progressive Party, in office since 8 March 2018.
No[a] Name Term of office[2] Party[b] Days in
office
1 P. Shilu Ao
MLA for Impur
1 December
1963
14 August
1966
Naga Nationalist
Organisation
987 days
2
T. N. Angami
```

</details>

<details><summary>chunk #9 (search rank 3)</summary>

```text
Angami-II
12 March
2008 24 May 2014
Nagaland People's
Front
2264
10 T. R. Zeliang
MLA for Peren
24 May
2014
22 February
2017 1005
11 Shurhozelie
Liezietsu
22 February
2017 19 July 2017 147
(10) T. R. Zeliang
MLA for Peren 19 July 2017 8 March
2018
232
[Total 1237
days]
(9)
Neiphiu Rio
MLA for Northern
Angami-II
8 March
2018 Incumbent
Nationalist
Democratic
Progressive Party
2223
Footnotes
Notes
```

</details>

<details><summary>chunk #8 (search rank 5)</summary>

```text
(President's
rule)
2 April 1992 22 February
1993 N/A
(6)
S. C. Jamir
MLA for
Aonglenden
22 February
1993
6 March
2003
Indian National
Congress
width="4px"
style="background-
color:
Template:Indian
National
Congress/meta/color"
|
3665 days
[Total 5625
days]
9
Neiphiu Rio
MLA for Northern
Angami-II
6 March
2003
3 January
2008
Nagaland People's
Front 1767 days
–
Vacant[c]
(President's
rule)
3 January
2008
12 March
2008 N/A
(9)
Neiphiu Rio
MLA for Northern
Angami-II
12 March
2008 24 May 2014
```

</details>

<details><summary>chunk #7 (search rank 8)</summary>

```text
(6)
S. C. Jamir
MLA for
Mokokchung
Town
25 January
1989 10 May 1990 Indian National
Congress
width="4px"
style="background-
color:
Template:Indian
National
Congress/meta/color"
|
471 days
7 K. L. Chishi
MLA for Atoizu
16 May
1990
19 June
1990
Indian National
Congress
width="4px"
style="background-
color:
Template:Indian
National
Congress/meta/color"
|
36 days
8 Vamuzo
Phesao
19 June
1990 2 April 1992 Nagaland People's
Council 653 days
–
Vacant[c]
(President's
rule)
2 April 1992 22 February
```

</details>

<details><summary>chunk #5 (search rank 10)</summary>

```text
N/A
(4)
Vizol Angami
MLA for Southern
Angami-II
25
November
1977
18 April
1980
United Democratic
Front
876 days
[Total 1254
days]
6
S. C. Jamir
MLA for
Aonglenden
18 April
1980 5 June 1980 United Democratic
Front—Progressive 49 days
(5)
John Bosco
Jasokie
MLA for Kohima
Town
5 June 1980
18
November
1982
Naga National
Democratic Party
897 days
[Total 908
days]
(6)
S. C. Jamir
MLA for
Aonglenden
18
November
1982
28 October
1986
United Democratic
Front—Progressive 1440 days
```

</details>

**Model answer, top 10:**

> The chief minister of Nagaland in 2018 was Neiphiu Rio.

Your grade (top 10): ____

**Model answer, top 15:**

> The chief minister of Nagaland in 2018 was Neiphiu Rio.

Your grade (top 15): ____

---

## 99. `feta-0386` (feta, 2017 World Championships in Athletics – Men's 100 metres)

**Question:** Who beat Bolt in the third semi-final?

**Reference answer:** In the third semi-final, Christian Coleman beat Bolt with 9.97 to his 9.98.

**Answer chunks:** 3 labelled:

<details><summary>chunk #28 (search rank 13)</summary>

```text
Rank Heat Lane Name Nationality Time Notes
1 3 4 Christian Coleman United States (USA) 9.97 Q
2 3 6 Usain Bolt Jamaica (JAM) 9.98 Q
3 2 4 Yohan Blake Jamaica (JAM) 10.04 Q
4 2 9 Reece Prescod Great Britain & N.I. (GBR) 10.05 Q
5 1 2 Akani Simbine South Africa (RSA) 10.05 Q
6 1 6 Justin Gatlin United States (USA) 10.09 Q
7 3 8 Jimmy Vicaut France (FRA) 10.09 q
8 2 6 Su Bingtian China (CHN) 10.10 q
9 3 7 Chijindu Ujah Great Britain & N.I. (GBR) 10.12
```

</details>

<details><summary>chunk #21 (search rank 15)</summary>

```text
Rank Heat Lane Name Nationality Time Notes
1 3 4 Julian Forte Jamaica (JAM) 9.99 Q, PB
2 1 9 Christian Coleman United States (USA) 10.01 Q
3 3 6 Ben Youssef Meïté Ivory Coast (CIV) 10.02 Q
4 4 4 Su Bingtian China (CHN) 10.03 Q, SB
5 3 2 Reece Prescod Great Britain & N.I. (GBR) 10.03 Q, PB
6 2 3 Abdul Hakim Sani Brown Japan (JPN) 10.05 Q, PB
6 5 5 Justin Gatlin United States (USA) 10.05 Q
8 6 7 Usain Bolt Jamaica (JAM) 10.07 Q
9 4 2 Chijindu Ujah Great Britain & N.I. (GBR) 10.07 Q
10
```

</details>

<details><summary>chunk #31 (search rank 16)</summary>

```text
Rank Lane Name Nationality Time Reaction Time Notes
8 Justin Gatlin United States (USA) 9.92 0.138 WMR SB
5 Christian Coleman United States (USA) 9.94 0.123
4 Usain Bolt Jamaica (JAM) 9.95 0.183 SB
4 7 Yohan Blake Jamaica (JAM) 9.99 0.137
5 6 Akani Simbine South Africa (RSA) 10.01 0.141
6 3 Jimmy Vicaut France (FRA) 10.08 0.152
7 9 Reece Prescod Great Britain & N.I. (GBR) 10.17 0.145
8 2 Su Bingtian China (CHN) 10.27 0.224
```

</details>

**Model answer, top 10:**

> Christian Coleman beat Bolt in the third semi-final.

Your grade (top 10): ____

**Model answer, top 15:**

> Christian Coleman beat Bolt in the third semi-final.

Your grade (top 15): ____

---

## 100. `tat-0631` (tat, altium-limited_2019)

**Question:** What is the debt-to-asset ratio in 2018?

**Reference answer:** 0.27

**Answer chunks:** 1 labelled:

<details><summary>chunk #403 (search rank 1)</summary>

```text
30 June 201968
Parent
2019
US$’000
2018
US$’000
Total current assets 121,041 73,202
Total assets 383,665 336,032
Total current liabilities 154,619 90,392
Total liabilities 155,521 92,364
Equity
Contributed equity 126,058 125,635
Foreign currency reserve 2,607 2,783
Equity compensation reserve 19,561 12,570
Retained profits 79,918 102,680
Total equity 228,144 243,668
Guarantees entered into by the parent entity in relation
to the debts of its subsidiaries
```

</details>

**Model answer, top 10:**

> The provided context is insufficient to answer this question.

Your grade (top 10): ____

**Model answer, top 15:**

> The provided context is insufficient to answer this question.

Your grade (top 15): ____
