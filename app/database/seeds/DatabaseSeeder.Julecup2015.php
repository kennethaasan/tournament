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
            'name' => 'Vanvikan Indoor 2023 Herrer',
            'date' => '2023-01-21',
            'location' => 'Vanvikanhallen'
        ));

        Tournament::create(array(
          'name' => 'Vanvikan Indoor 2023 Damer',
          'date' => '2023-01-22',
          'location' => 'Vanvikanhallen'
      ));

    }
}

class TeamsTableSeeder extends Seeder {

    public function run()
    {
        DB::table('teams')->delete();

        Team::create(array('name' => 'Vanvik IL 1', 'group_code' => 'A'));
        Team::create(array('name' => 'UIF Bjørgan', 'group_code' => 'A'));
        Team::create(array('name' => 'Lensvik IL 1', 'group_code' => 'A'));
        Team::create(array('name' => 'Ørland BK 2', 'group_code' => 'A'));
        Team::create(array('name' => 'Rissa IL 2', 'group_code' => 'A')); // 5

        Team::create(array('name' => 'Ørland BK 1', 'group_code' => 'B'));
        Team::create(array('name' => 'Malvik IL', 'group_code' => 'B'));
        Team::create(array('name' => 'Stjørna IL', 'group_code' => 'B'));
        Team::create(array('name' => 'Neset FK 2', 'group_code' => 'B'));
        Team::create(array('name' => 'FK Fosen 2', 'group_code' => 'B')); // 10

        Team::create(array('name' => 'Neset FK 1', 'group_code' => 'C'));
        Team::create(array('name' => 'FK Fosen 1', 'group_code' => 'C'));
        Team::create(array('name' => 'Rissa IL 1', 'group_code' => 'C'));
        Team::create(array('name' => 'Vanvik IL 2', 'group_code' => 'C'));
        Team::create(array('name' => 'Lensvik IL 2', 'group_code' => 'C')); // 15

        Team::create(array('name' => 'Vinner A', 'group_code' => 'C')); // 16
        Team::create(array('name' => 'Vinner B', 'group_code' => 'C')); // 17
        Team::create(array('name' => 'Vinner C', 'group_code' => 'C')); // 18
        Team::create(array('name' => 'Beste 2. plass', 'group_code' => 'C')); // 19


        Team::create(array('name' => 'Melhus/Gimse 1', 'group_code' => 'A')); // 20
        Team::create(array('name' => 'Charlottenlund SK', 'group_code' => 'A'));
        Team::create(array('name' => 'Stadsbygd IL 1', 'group_code' => 'A'));
        Team::create(array('name' => 'Levanger FK 2', 'group_code' => 'A'));
        Team::create(array('name' => 'KIL/Hemne 2', 'group_code' => 'A'));

        Team::create(array('name' => 'Nardo FK 1', 'group_code' => 'B')); // 25
        Team::create(array('name' => 'Sverresborg Fotball', 'group_code' => 'B'));
        Team::create(array('name' => 'Sokna IL', 'group_code' => 'B'));
        Team::create(array('name' => 'FK Fosen', 'group_code' => 'B'));
        Team::create(array('name' => 'FK Fosen 2', 'group_code' => 'B'));

        Team::create(array('name' => 'KIL/Hemne 1', 'group_code' => 'C')); // 30
        Team::create(array('name' => 'Levanger FK 1', 'group_code' => 'C'));
        Team::create(array('name' => 'Nardo FK 2', 'group_code' => 'C'));
        Team::create(array('name' => 'Stadsbygd IL 2', 'group_code' => 'C')); // 33

        Team::create(array('name' => 'S1', 'group_code' => 'C')); // 34
        Team::create(array('name' => 'S2', 'group_code' => 'C')); // 35
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

				$this->generateMatch(1, '09:00', 1, 'B', 6, 8);
				$this->generateMatch(1, '09:20', 1, 'B', 7, 10);

				$this->generateMatch(1, '09:40', 1, 'A', 1, 5);
				$this->generateMatch(1, '10:00', 1, 'A', 2, 4);

				$this->generateMatch(1, '10:20', 1, 'C', 12, 13);
				$this->generateMatch(1, '10:40', 1, 'C', 11, 14);


        $this->generateMatch(1, '11:00', 1, 'B', 6, 10);
				$this->generateMatch(1, '11:20', 1, 'B', 7, 9);

				$this->generateMatch(1, '11:40', 1, 'A', 5, 2);
				$this->generateMatch(1, '12:00', 1, 'A', 3, 1);

				$this->generateMatch(1, '12:20', 1, 'C', 12, 11);
				$this->generateMatch(1, '12:40', 1, 'C', 13, 15);


        $this->generateMatch(1, '13:00', 1, 'B', 9, 6);
				$this->generateMatch(1, '13:20', 1, 'B', 8, 10);

				$this->generateMatch(1, '13:40', 1, 'A', 5, 4);
				$this->generateMatch(1, '14:00', 1, 'A', 3, 2);

				$this->generateMatch(1, '14:20', 1, 'C', 12, 14);
				$this->generateMatch(1, '14:40', 1, 'C', 11, 15);


        $this->generateMatch(1, '15:00', 1, 'B', 7, 6);
				$this->generateMatch(1, '15:20', 1, 'B', 9, 8);

				$this->generateMatch(1, '15:40', 1, 'A', 1, 4);
				$this->generateMatch(1, '16:00', 1, 'A', 3, 5);

				$this->generateMatch(1, '16:20', 1, 'C', 12, 15);
				$this->generateMatch(1, '16:40', 1, 'C', 13, 14);


        $this->generateMatch(1, '17:00', 1, 'B', 9, 10);
				$this->generateMatch(1, '17:20', 1, 'B', 7, 8);

				$this->generateMatch(1, '17:40', 1, 'A', 1, 2);
				$this->generateMatch(1, '18:00', 1, 'A', 3, 4);

				$this->generateMatch(1, '18:20', 1, 'C', 11, 13);
				$this->generateMatch(1, '18:40', 1, 'C', 14, 15);


        $this->generateMatch(1, '19:00', 1, 'S1', 17, 18);
				$this->generateMatch(1, '19:20', 1, 'S2', 16, 19);
				$this->generateMatch(1, '20:00', 1, 'F', 34, 35);

        // ----------------------------------------------------------------------------------------

        $this->generateMatch(2, '09:20', 1, 'A', 21, 22);
				$this->generateMatch(2, '09:40', 1, 'A', 24, 23);

				$this->generateMatch(2, '10:00', 1, 'B', 25, 26);
				$this->generateMatch(2, '10:20', 1, 'B', 28, 27);

				$this->generateMatch(2, '10:40', 1, 'C', 32, 33);
				$this->generateMatch(2, '11:00', 1, 'C', 30, 31);


        $this->generateMatch(2, '11:20', 1, 'A', 20, 22);
				$this->generateMatch(2, '11:40', 1, 'A', 24, 21);

				$this->generateMatch(2, '12:00', 1, 'B', 28, 26);
				$this->generateMatch(2, '12:20', 1, 'B', 29, 25);


        $this->generateMatch(2, '12:40', 1, 'A', 21, 20);
				$this->generateMatch(2, '13:00', 1, 'A', 23, 24);

				$this->generateMatch(2, '13:20', 1, 'B', 25, 28);
				$this->generateMatch(2, '13:40', 1, 'B', 27, 29);

        $this->generateMatch(2, '14:00', 1, 'C', 30, 32);
				$this->generateMatch(2, '14:20', 1, 'C', 31, 33);


        $this->generateMatch(2, '14:40', 1, 'A', 21, 24);
				$this->generateMatch(2, '15:00', 1, 'A', 22, 24);

				$this->generateMatch(2, '15:20', 1, 'B', 25, 27);
				$this->generateMatch(2, '15:40', 1, 'B', 26, 29);

        $this->generateMatch(2, '16:00', 1, 'C', 30, 33);
				$this->generateMatch(2, '16:20', 1, 'C', 31, 32);


        $this->generateMatch(2, '16:40', 1, 'A', 20, 24);
				$this->generateMatch(2, '17:00', 1, 'A', 22, 23);

				$this->generateMatch(2, '17:20', 1, 'B', 28, 29);
				$this->generateMatch(2, '17:40', 1, 'B', 26, 27);




        $this->generateMatch(2, '19:00', 1, 'S1', 17, 18);
				$this->generateMatch(2, '19:20', 1, 'S2', 16, 19);
				$this->generateMatch(2, '20:00', 1, 'F', 34, 35);

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
