tournament
==========

Football tournament administration made with Laravel and Angular


sql
==========

tournament(id, name)

team(id, group_code enum('A', 'B', 'C', 'D', 'W'), name)

player(id, name, team_id)

match(id, kickoff_at)

group_match(id, match_id, team_id_home, team_id_away, group_code)

knockout_match(id, match_id, knockout_code enum('Q1', 'Q2', 'Q3', 'Q4', 'S1', 'S2', 'F')

result(match_id, score_home, score_away)

goal(id, match_id, player_id)
