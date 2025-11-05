# tournament

Football tournament administration made with Laravel and Angular

# sql

http://laravel.com/docs/4.2/eloquent

tournament(id, name)

team(id, group_code enum('A', 'B', 'C', 'D', 'W'), name)

player(id, name, team_id, paid)

match(id, tournament_id, kickoff_at, match_code enum('A', 'B', 'C', 'D', 'W', Q1', 'Q2', 'Q3', 'Q4', 'S1', 'S2', 'F', team_id_home, team_id_away, score_home, score_away)

goal(id, match_id, player_id)

---

Docker
https://laradock.io/

Follow install instructions

Set in .env

APP_CODE_PATH_HOST=../tournament
WORKSPACE_COMPOSER_VERSION=1
MYSQL_VERSION=8.0

Use PHP 5.6

docker-compose exec workspace bash

run

composer install

php artisan migrate:install

php artisan migrate:refresh && php artisan db:seed

# Update from 2024

```bash
docker-compose up -d nginx mysql phpmyadmin workspace
docker-compose exec workspace bash
```

(This might not be necessary)
Add `extension=mcrypt.so` with `vim /etc/php/7.2/cli/php.ini`

```bash
php -v
```

On the first run, you need to run the following command:

```bash
php artisan migrate
```

```bash
php artisan migrate:refresh && php artisan db:seed
```

Open phpmyadmin at http://localhost:8081/ with the following credentials:

mysql
root
root
