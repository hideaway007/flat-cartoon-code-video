"""Characters of this project (design dicts for toon.draw_character; colours are BGR).
Keys are documented at the top of toon.py's characters section. Example: The Rope (Joe, Simon)."""

JOE = dict(
    name="joe", jacket=(42, 44, 178), jacket_dk=(34, 34, 140), puffy=True, trousers=(84, 46, 52), boots=(52, 92, 140),
    hair=(36, 66, 112), hair_dk=(26, 48, 86), harness=(48, 84, 122), rope=(32, 132, 240), pack=(46, 72, 104),
    leg_u=135, leg_l=130, torso=270, head_rx=160, head_ry=182, hat=None, style="messy")

SIMON = dict(
    name="simon", jacket=(118, 112, 40), jacket_dk=(92, 88, 30), puffy=False, trousers=(128, 122, 120),
    boots=(52, 92, 140), hair=(112, 202, 236), hair_dk=(80, 160, 200), harness=(48, 84, 122), rope=(156, 150, 36),
    pack=(46, 72, 104), leg_u=160, leg_l=155, torso=300, head_rx=150, head_ry=176, hat=(40, 166, 216), style="beanie")

CAST = dict(joe=JOE, simon=SIMON)
