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
            'name' => 'Vanvikan Indoor 2024 Herrer',
            'date' => '2024-01-20',
            'location' => 'Vanvikanhallen'
        ));

        Tournament::create(array(
          'name' => 'Vanvikan Indoor 2024 Damer',
          'date' => '2024-01-21',
          'location' => 'Vanvikanhallen'
      ));

    }
}

class TeamsTableSeeder extends Seeder {

    public function run()
    {
        DB::table('teams')->delete();

        Team::create(array('name' => 'FK Fosen 1', 'group_code' => 'A')); 
        Team::create(array('name' => 'Vanvik', 'group_code' => 'A'));
        Team::create(array('name' => 'Stjørna IL', 'group_code' => 'A'));
        Team::create(array('name' => 'Kattem FK', 'group_code' => 'A'));
        Team::create(array('name' => 'Neset FK', 'group_code' => 'A'));

        Team::create(array('name' => 'FK Fosen 2', 'group_code' => 'B'));
        Team::create(array('name' => 'Levangerstudentene', 'group_code' => 'B'));
        Team::create(array('name' => 'UIF Bjørgan', 'group_code' => 'B'));
        Team::create(array('name' => 'Buvik IL 2', 'group_code' => 'B'));

        Team::create(array('name' => 'Buvik IL 1', 'group_code' => 'C'));
        Team::create(array('name' => 'Malvik/Hommelvik', 'group_code' => 'C'));
        Team::create(array('name' => 'Leksvik', 'group_code' => 'C'));
        Team::create(array('name' => 'Rissa IL', 'group_code' => 'C'));
        Team::create(array('name' => 'Namdalseid', 'group_code' => 'C')); // 14

        Team::create(array('name' => 'Vinner A')); // 15
        Team::create(array('name' => 'Vinner B')); // 16
        Team::create(array('name' => 'Vinner C')); // 17
        Team::create(array('name' => 'Beste 2. plass')); // 18 


        Team::create(array('name' => 'Malvik', 'group_code' => 'A')); // 19
        Team::create(array('name' => 'Verdal IL', 'group_code' => 'A')); 
        Team::create(array('name' => 'FK Fosen 1', 'group_code' => 'A')); 
        Team::create(array('name' => 'Orkla FK 2', 'group_code' => 'A')); 

        Team::create(array('name' => 'Levanger FK', 'group_code' => 'B')); 
        Team::create(array('name' => 'Ranheim', 'group_code' => 'B')); 
        Team::create(array('name' => 'Orkla FK 1', 'group_code' => 'B')); 
        Team::create(array('name' => 'FK Fosen 2', 'group_code' => 'B')); 
        Team::create(array('name' => 'Stadsbygd IL', 'group_code' => 'B')); // 27

        Team::create(array('name' => '2. plass gruppe A')); // 28
        Team::create(array('name' => '2. plass gruppe B')); // 29

        Team::create(array('name' => 'Vinner S1')); // 30
        Team::create(array('name' => 'Vinner S2')); // 31
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

				$this->generateMatch(1, '09:00', 1, 'A', 1, 2);
				$this->generateMatch(1, '09:20', 1, 'B', 6, 7);

				$this->generateMatch(1, '09:40', 1, 'C', 10, 11);
				$this->generateMatch(1, '10:00', 1, 'A', 3, 4);

				$this->generateMatch(1, '10:20', 1, 'C', 12, 13);
				$this->generateMatch(1, '10:40', 1, 'A', 1, 5);


        $this->generateMatch(1, '11:00', 1, 'B', 6, 9);
				$this->generateMatch(1, '11:20', 1, 'C', 10, 14);

				$this->generateMatch(1, '11:40', 1, 'A', 2, 4);
				$this->generateMatch(1, '12:00', 1, 'B', 7, 8);

				$this->generateMatch(1, '12:20', 1, 'C', 11, 13);
				$this->generateMatch(1, '12:40', 1, 'A', 3, 5);


        $this->generateMatch(1, '13:00', 1, 'C', 12, 14);
				$this->generateMatch(1, '13:20', 1, 'A', 1, 4);

				$this->generateMatch(1, '13:40', 1, 'B', 6, 8);
				$this->generateMatch(1, '14:00', 1, 'C', 10, 13);

				$this->generateMatch(1, '14:20', 1, 'A', 2, 3);
				$this->generateMatch(1, '14:40', 1, 'C', 11, 12);


        $this->generateMatch(1, '15:00', 1, 'A', 5, 4);
				$this->generateMatch(1, '15:20', 1, 'B', 9, 8);

				$this->generateMatch(1, '15:40', 1, 'C', 14, 13);
				$this->generateMatch(1, '16:00', 1, 'A', 1, 3);

				$this->generateMatch(1, '16:20', 1, 'C', 10, 12);
				$this->generateMatch(1, '16:40', 1, 'A', 2, 5);


        $this->generateMatch(1, '17:00', 1, 'B', 7, 9);
				$this->generateMatch(1, '17:20', 1, 'C', 11, 14);

        $this->generateMatch(1, '17:40', 1, 'S1', 15, 16);
				$this->generateMatch(1, '18:00', 1, 'S2', 17, 18);
				$this->generateMatch(1, '18:20', 1, 'F', 30, 31);

        // ----------------------------------------------------------------------------------------

        $this->generateMatch(2, '09:30', 1, 'A', 19, 20);
				$this->generateMatch(2, '09:50', 1, 'B', 23, 24);

				$this->generateMatch(2, '10:10', 1, 'A', 21, 22);
				$this->generateMatch(2, '10:30', 1, 'B', 25, 26);

				$this->generateMatch(2, '10:50', 1, 'B', 23, 27);
				$this->generateMatch(2, '11:10', 1, 'A', 20, 22);


        $this->generateMatch(2, '11:30', 1, 'B', 24, 26);
				$this->generateMatch(2, '11:50', 1, 'B', 25, 27);

				$this->generateMatch(2, '12:10', 1, 'A', 19, 22);
				$this->generateMatch(2, '12:30', 1, 'B', 23, 26);


        $this->generateMatch(2, '12:50', 1, 'A', 20, 21);
				$this->generateMatch(2, '13:10', 1, 'B', 24, 25);

				$this->generateMatch(2, '13:30', 1, 'B', 27, 26);
				$this->generateMatch(2, '13:50', 1, 'A', 19, 21);

        $this->generateMatch(2, '14:10', 1, 'B', 23, 25);
				$this->generateMatch(2, '14:30', 1, 'B', 24, 27);


        $this->generateMatch(2, '14:50', 1, 'S1', 15, 29);
				$this->generateMatch(2, '15:10', 1, 'S2', 16, 28);
				$this->generateMatch(2, '15:30', 1, 'F', 30, 31);

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
