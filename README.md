tournament
==========

Football tournament administration made with Laravel and Angular


sql
==========
http://laravel.com/docs/4.2/eloquent

tournament(id, name)

team(id, group_code enum('A', 'B', 'C', 'D', 'W'), name)

player(id, name, team_id, paid)

match(id, tournament_id, kickoff_at, team_id_home, team_id_away, score_home, score_away)

group_match(id, match_id, group_code enum('A', 'B', 'C', 'D', 'W'))

knockout_match(id, match_id, knockout_code enum('Q1', 'Q2', 'Q3', 'Q4', 'S1', 'S2', 'F')

goal(id, match_id, player_id)
