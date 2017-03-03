<?php


use \Faker\Factory as Faker;

class DatabaseSeeder extends Seeder {

		/**
		 * Run the database seeds.
		 *
		 * @return void
		 */
		public function run()
		{
				Eloquent::unguard();

				$this->call('UserTableSeeder');
				$this->command->info('User table seeded!');

				$this->call('TournamentTableSeeder');
				$this->command->info('Tournament table seeded!');

				$this->call('TeamsTableSeeder');
				$this->command->info('Team table seeded!');

				//$this->call('PlayersTableSeeder');
				//$this->command->info('Player table seeded!');

				$this->call('MatchesTableSeeder');
				$this->command->info('Match table seeded!');

				//$this->call('GoalsTableSeeder');
				//$this->command->info('Goal table seeded!');

		}
}

class UserTableSeeder extends Seeder {

    public function run()
    {
        DB::table('users')->delete();

        User::create(array(
            'email' => 'admin@admin.no',
            'password' => Hash::make('admin'),
            'admin' => true
        ));

        User::create(array(
            'email' => 'admin2@admin2.no',
            'password' => Hash::make('admin2'),
            'admin' => true
        ));


        /*$faker = Faker::create();

        foreach (range(1, 47) as $index) {
            User::create(array(
                'email' => $faker->email(),
                'password' => Hash::make($faker->word(10)),
                'teacher' => false
            ));
        }*/

    }
}

class TournamentTableSeeder extends Seeder {

    public function run()
    {
        DB::table('tournaments')->delete();

        Tournament::create(array(
            'name' => 'Vanvikan Indoor 2017',
            'date' => '2017-01-21',
            'location' => 'Vanvikanhallen'
        ));

    }
}

class TeamsTableSeeder extends Seeder {

    public function run()
    {
        DB::table('teams')->delete();

        Team::create(array('name' => 'Vinner gruppe A')); //1
        Team::create(array('name' => '2. plass gruppe A')); //2

        Team::create(array('name' => 'Vinner gruppe B')); //3
        Team::create(array('name' => '2. plass gruppe B')); //4

        Team::create(array('name' => 'Vinner gruppe C')); //5
        Team::create(array('name' => '2. plass gruppe C')); //6

        Team::create(array('name' => 'Vinner gruppe D')); //7
        Team::create(array('name' => '2. plass gruppe D')); //8

        Team::create(array('name' => 'Vinner Q1')); //9
        Team::create(array('name' => 'Vinner Q2')); //10
        Team::create(array('name' => 'Vinner Q3')); //11
        Team::create(array('name' => 'Vinner Q4')); //12

        Team::create(array('name' => 'Vinner S1')); //13
        Team::create(array('name' => 'Vinner S2')); //14


        Team::create(array('name' => 'Åfjord', 'group_code' => 'A')); // 1
				Team::create(array('name' => 'Ørland 1', 'group_code' => 'A')); // 2
				Team::create(array('name' => 'Leik 1', 'group_code' => 'A')); // 3
				Team::create(array('name' => 'Rissa jr', 'group_code' => 'A')); // 4

				Team::create(array('name' => 'Bjørgan', 'group_code' => 'B')); // 5
				Team::create(array('name' => 'Vanvik 1', 'group_code' => 'B')); // 6
				Team::create(array('name' => 'Jøssund', 'group_code' => 'B')); // 7
				Team::create(array('name' => 'Leik 2', 'group_code' => 'B')); // 8

				Team::create(array('name' => 'Byåsen TF 1', 'group_code' => 'C')); // 9
				Team::create(array('name' => 'Rissa', 'group_code' => 'C')); // 10
				Team::create(array('name' => 'FK Fosen', 'group_code' => 'C')); // 11
				Team::create(array('name' => 'Vanvik 2', 'group_code' => 'C')); // 12

        Team::create(array('name' => 'Neset', 'group_code' => 'C')); // 13
				Team::create(array('name' => 'Byåsen TF 2', 'group_code' => 'C')); // 14
				Team::create(array('name' => 'Ørland 2', 'group_code' => 'C')); // 15
				Team::create(array('name' => 'Leksvik', 'group_code' => 'C')); // 16
    }
}

class PlayersTableSeeder extends Seeder {

    public function run()
    {
        DB::table('players')->delete();

        $faker = Faker::create();

        foreach (range(1, 200) as $index) {
            Player::create(array(
                'name' => $faker->name(),
                'number' => $faker->numberBetween(1, 99),
                'paid' => $faker->boolean(),
                'team_id' => $faker->numberBetween(1, 25)
            ));
        }

    }
}

class MatchesTableSeeder extends Seeder {

    public function run() {

        DB::table('matches')->delete();

        $tournament_id = 1;
        $team_id = 15;

        $this->generateMatch($tournament_id, '09:30', 1, 'A', $team_id, $team_id + 2);
        $this->generateMatch($tournament_id, '09:50', 1, 'A', $team_id + 1, $team_id + 3);

        $this->generateMatch($tournament_id, '10:10', 1, 'B', $team_id + 4, $team_id + 6);
        $this->generateMatch($tournament_id, '10:30', 1, 'B', $team_id + 5, $team_id + 7);

        $this->generateMatch($tournament_id, '10:50', 1, 'C', $team_id + 8, $team_id + 10);
        $this->generateMatch($tournament_id, '11:10', 1, 'C', $team_id + 9, $team_id + 11);

        $this->generateMatch($tournament_id, '11:30', 1, 'D', $team_id + 12, $team_id + 14);
        $this->generateMatch($tournament_id, '11:50', 1, 'D', $team_id + 13, $team_id + 15);


        $this->generateMatch($tournament_id, '12:10', 1, 'A', $team_id, $team_id + 1);
        $this->generateMatch($tournament_id, '12:30', 1, 'A', $team_id + 3, $team_id + 2);

        $this->generateMatch($tournament_id, '12:50', 1, 'B', $team_id + 4, $team_id + 1 + 4);
        $this->generateMatch($tournament_id, '13:10', 1, 'B', $team_id + 3 + 4, $team_id + 2 + 4);

        $this->generateMatch($tournament_id, '13:30', 1, 'C', $team_id + 8, $team_id + 1 + 8);
        $this->generateMatch($tournament_id, '13:50', 1, 'C', $team_id + 3 + 8, $team_id + 2 + 8);

        $this->generateMatch($tournament_id, '14:10', 1, 'D', $team_id + 12, $team_id + 1 + 12);
        $this->generateMatch($tournament_id, '14:30', 1, 'D', $team_id + 3 + 12, $team_id + 2 + 12);


        $this->generateMatch($tournament_id, '14:50', 1, 'A', $team_id + 3, $team_id);
        $this->generateMatch($tournament_id, '15:10', 1, 'A', $team_id + 2, $team_id + 1);

        $this->generateMatch($tournament_id, '15:30', 1, 'B', $team_id + 3 + 4, $team_id + 4);
        $this->generateMatch($tournament_id, '15:50', 1, 'B', $team_id + 2 + 4, $team_id + 1 + 4);

        $this->generateMatch($tournament_id, '16:10', 1, 'C', $team_id + 3 + 8, $team_id + 8);
        $this->generateMatch($tournament_id, '16:30', 1, 'C', $team_id + 2 + 8, $team_id + 1 + 8);

        $this->generateMatch($tournament_id, '16:50', 1, 'D', $team_id + 3 + 12, $team_id + 12);
        $this->generateMatch($tournament_id, '17:10', 1, 'D', $team_id + 2 + 12, $team_id + 1 + 12);


        $this->generateMatch($tournament_id, '17:30', 1, 'Q1', 1, 4);
        $this->generateMatch($tournament_id, '17:50', 1, 'Q2', 5, 8);

        $this->generateMatch($tournament_id, '18:10', 1, 'Q3', 3, 2);
        $this->generateMatch($tournament_id, '18:30', 1, 'Q4', 7, 6);

        $this->generateMatch($tournament_id, '18:50', 1, 'S1', 9, 10);
        $this->generateMatch($tournament_id, '19:10', 1, 'S2', 11, 12);

        $this->generateMatch($tournament_id, '19:45', 1, 'F', 13, 14);

    }

    private function generateMatch($tournament_id, $kickoff_at, $field, $match_code, $hometeam_id, $awayteam_id) {
        $faker = Faker::create();

        Match::create(array(
            'tournament_id' => $tournament_id,
            'kickoff_at'    => $kickoff_at,
            'field'         => $field,
            'match_code'    => $match_code,
            'hometeam_id'   => $hometeam_id,
            'awayteam_id'   => $awayteam_id,
            'score_home'    => null,
            'score_away'    => null
        ));
    }
}

class GoalsTableSeeder extends Seeder {

    public function run() {

        DB::table('goals')->delete();

        $faker = Faker::create();

        foreach (range(1, 100) as $index) {
            Goal::create(array(
                'match_id'      => $faker->numberBetween(1, 25),
                'player_id'     => $faker->numberBetween(1, 100)
            ));
        }
    }
}
