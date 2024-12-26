tournament
==========

Football tournament administration made with Laravel and Angular


sql
==========
http://laravel.com/docs/4.2/eloquent

tournament(id, name)

team(id, group_code enum('A', 'B', 'C', 'D', 'W'), name)

player(id, name, team_id, paid)

match(id, tournament_id, kickoff_at, match_code enum('A', 'B', 'C', 'D', 'W', Q1', 'Q2', 'Q3', 'Q4', 'S1', 'S2', 'F', team_id_home, team_id_away, score_home, score_away)

goal(id, match_id, player_id)

--- 
Docker
https://laradock.io/


# docker-compose up -d nginx mysql phpmyadmin workspace 
# docker-compose exec workspace bash
# add "extension=mcrypt.so" to "vim /etc/php/7.2/cli/php.ini"
# php -v
# php artisan migrate:refresh && php artisan db:seed

phpmyadmin
http://localhost:8081
use server: "mysql", user: "default" and password: "secret"