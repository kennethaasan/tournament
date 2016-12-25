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
            'name' => 'Vanvikan Påskecup 2016',
            'date' => '2016-03-19',
            'location' => 'Vanvikanhallen'
        ));

    }
}

class TeamsTableSeeder extends Seeder {

    public function run()
    {
        DB::table('teams')->delete();

				Team::create(array('name' => 'Grøntvedt og co', 'group_code' => 'A'));
        Team::create(array('name' => 'Angry koks & the lost balls', 'group_code' => 'A'));
				Team::create(array('name' => 'Vanvikan trekkspellforening', 'group_code' => 'B'));
        Team::create(array('name' => 'Påskeharan', 'group_code' => 'A'));
        Team::create(array('name' => 'FC Glæfs', 'group_code' => 'A'));

				// 1
				// 2-3
				// 4-5

				// 2
				// 1-5
				// 3-4

				// 3
				// 1-4
				// 2-5

				// 4
				// 1-2
				// 3-5

				// 5
				// 1-3
				// 2-4

				Team::create(array('name' => 'Hammarstrand Curlingklubb', 'group_code' => 'B'));
				Team::create(array('name' => 'Liggeunderlaget', 'group_code' => 'B'));
        Team::create(array('name' => '50 Shades O`Shea', 'group_code' => 'B'));
        Team::create(array('name' => 'RFSU', 'group_code' => 'A'));

				// 1 2
				// 3 4

				// 1 3
				// 2 4

				// 1 4
				// 2 3

				Team::create(array('name' => 'Nederlaget', 'group_code' => 'W'));
        Team::create(array('name' => 'Røkla', 'group_code' => 'W'));
        Team::create(array('name' => 'Ozonlaget', 'group_code' => 'W'));

				Team::create(array('name' => '2. plass A')); // 13
				Team::create(array('name' => '3. plass A')); // 14

				Team::create(array('name' => '2. plass B')); // 15
				Team::create(array('name' => '3. plass B')); //16

				Team::create(array('name' => '1. plass A')); //17
				Team::create(array('name' => '1. plass B')); //18

				Team::create(array('name' => 'Vinner Q1')); //19
				Team::create(array('name' => 'Vinner Q2'));

				Team::create(array('name' => 'Vinner S1'));
				Team::create(array('name' => 'Vinner S2'));

				// 1 2

				// 1 3

				// 2 3

				// 2 1

				// 3 1

				// 3 2
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

				// 1
				// 2-3
				// 4-5

				// 2
				// 1-5
				// 3-4

				// 3
				// 1-4
				// 2-5

				// 4
				// 1-2
				// 3-5

				// 5
				// 1-3
				// 2-4



								// 1 2

								// 1 3

								// 2 3

								// 2 1

								// 3 1

								// 3 2



				$this->generateMatch(1, '11:00', 1, 'A', 1, 4);
				$this->generateMatch(1, '11:00', 2, 'A', 2, 5);

				$this->generateMatch(1, '11:15', 1, 'B', 1+5, 2+5);
        $this->generateMatch(1, '11:15', 2, 'B', 3+5, 4+5);

				$this->generateMatch(1, '11:30', 1, 'W', 1+9, 2+9);


				$this->generateMatch(1, '11:45', 1, 'A', 1, 3);
				$this->generateMatch(1, '11:45', 2, 'A', 4, 5);

				$this->generateMatch(1, '12:00', 1, 'B', 1+5, 3+5);
				$this->generateMatch(1, '12:00', 2, 'B', 2+5, 4+5);

				$this->generateMatch(1, '12:15', 1, 'W', 1+9, 3+9);


				$this->generateMatch(1, '12:30', 1, 'A', 1, 2);
				$this->generateMatch(1, '12:30', 2, 'A', 3, 4);
				//
				$this->generateMatch(1, '12:45', 1, 'B', 1+5, 4+5);
				$this->generateMatch(1, '12:45', 2, 'B', 2+5, 3+5);
				//
				$this->generateMatch(1, '13:00', 1, 'W', 2+9, 3+9);


				$this->generateMatch(1, '13:15', 1, 'A', 1, 5);
        $this->generateMatch(1, '13:15', 2, 'A', 2, 3);

				$this->generateMatch(1, '13:30', 1, 'W', 2+9, 1+9);


				$this->generateMatch(1, '13:45', 1, 'A', 2, 4);
				$this->generateMatch(1, '13:45', 2, 'A', 3, 5);

				$this->generateMatch(1, '14:00', 1, 'W', 3+9, 1+9);

				$this->generateMatch(1, '14:15', 1, 'Q1', 13, 14);
				$this->generateMatch(1, '14:15', 2, 'Q2', 15, 16);

				$this->generateMatch(1, '14:30', 1, 'W', 3+9, 2+9);

        $this->generateMatch(1, '14:45', 1, 'S1', 17, 20);
        $this->generateMatch(1, '14:45', 2, 'S2', 18, 19);

        $this->generateMatch(1, '15:00', 1, 'F', 21, 22);







        // $this->generateMatch(1, '11:00', 1, 'A', 1, 4);
        // $this->generateMatch(1, '11:00', 2, 'A', 2, 5);
				//
        // $this->generateMatch(1, '11:15', 1, 'B', 1+5, 4+5);
        // $this->generateMatch(1, '11:15', 2, 'B', 2+5, 5+5);
				//
        // $this->generateMatch(1, '11:30', 1, 'C', 1+10, 4+10);
        // $this->generateMatch(1, '11:30', 2, 'C', 2+10, 5+10);
				//
        // $this->generateMatch(1, '11:45', 1, 'D', 1+15, 4+15);
        // $this->generateMatch(1, '11:45', 2, 'D', 2+15, 5+15);
				//
				//
        // $this->generateMatch(1, '12:00', 1, 'A', 1, 3);
        // $this->generateMatch(1, '12:00', 2, 'A', 4, 5);
				//
        // $this->generateMatch(1, '12:15', 1, 'B', 1+5, 3+5);
        // $this->generateMatch(1, '12:15', 2, 'B', 4+5, 5+5);
				//
        // $this->generateMatch(1, '12:30', 1, 'C', 1+10, 3+10);
        // $this->generateMatch(1, '12:30', 2, 'C', 4+10, 5+10);
				//
        // $this->generateMatch(1, '12:45', 1, 'D', 1+15, 3+15);
        // $this->generateMatch(1, '12:45', 2, 'D', 4+15, 5+15);
				//
				//
        // $this->generateMatch(1, '13:00', 1, 'A', 1, 2);
        // $this->generateMatch(1, '13:00', 2, 'A', 3, 4);
				//
        // $this->generateMatch(1, '13:15', 1, 'B', 1+5, 2+5);
        // $this->generateMatch(1, '13:15', 2, 'B', 3+5, 4+5);
				//
        // $this->generateMatch(1, '13:30', 1, 'C', 1+10, 2+10);
        // $this->generateMatch(1, '13:30', 2, 'C', 3+10, 4+10);
				//
        // $this->generateMatch(1, '13:45', 1, 'D', 1+15, 2+15);
        // $this->generateMatch(1, '13:45', 2, 'D', 3+15, 4+15);
				//
				//
        // $this->generateMatch(1, '14:00', 1, 'A', 1, 5);
        // $this->generateMatch(1, '14:00', 2, 'A', 2, 3);
				//
        // $this->generateMatch(1, '14:15', 1, 'B', 1+5, 5+5);
        // $this->generateMatch(1, '14:15', 2, 'B', 2+5, 3+5);
				//
        // $this->generateMatch(1, '14:30', 1, 'C', 1+10, 5+10);
        // $this->generateMatch(1, '14:30', 2, 'C', 2+10, 3+10);
				//
        // $this->generateMatch(1, '14:45', 1, 'D', 1+15, 5+15);
        // $this->generateMatch(1, '14:45', 2, 'D', 2+15, 3+15);
				//
				//
        // $this->generateMatch(1, '15:00', 1, 'A', 2, 4);
        // $this->generateMatch(1, '15:00', 2, 'A', 3, 5);
				//
        // $this->generateMatch(1, '15:15', 1, 'B', 2+5, 4+5);
        // $this->generateMatch(1, '15:15', 2, 'B', 3+5, 5+5);
				//
        // $this->generateMatch(1, '15:30', 1, 'C', 2+10, 4+10);
        // $this->generateMatch(1, '15:30', 2, 'C', 3+10, 5+10);
				//
        // $this->generateMatch(1, '15:45', 1, 'D', 2+15, 4+15);
        // $this->generateMatch(1, '15:45', 2, 'D', 3+15, 5+15);

        //$this->generateMatch(1, '16:00', 1, 'Q1', null, null);
        //$this->generateMatch(1, '16:00', 2, 'Q2', null, null);

        //$this->generateMatch(1, '16:15', 1, 'Q3', null, null);
        //$this->generateMatch(1, '16:15', 2, 'Q4', null, null);

        //$this->generateMatch(1, '16:45', 1, 'S1', null, null);
        //$this->generateMatch(1, '16:45', 2, 'S2', null, null);

        //$this->generateMatch(1, '17:15', 1, 'F', null, null);

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
