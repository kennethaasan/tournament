<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;

class CreateTeamTournamentTable extends Migration {

	/**
	 * Run the migrations.
	 *
	 * @return void
	 */
	public function up()
	{
		Schema::create('matches', function(Blueprint $table)
		{
			$table->increments('id');
			$table->integer('tournament_id')->unsigned()->index();
			$table->foreign('tournament_id')->references('id')->on('tournaments')->onDelete('cascade');
			
			$table->integer('hometeam_id')->unsigned()->index()->nullable;
			$table->foreign('hometeam_id')->references('id')->on('teams')->onDelete('cascade');
			$table->integer('awayteam_id')->unsigned()->index()->nullable;
			$table->foreign('awayteam_id')->references('id')->on('teams')->onDelete('cascade');
			

			$table->time('start_time')->nullable();
			$table->integer('hometeam_goals')->nullable();
			$table->integer('awayteam_goals')->nullable();


			$table->timestamps();
		});
	}


	/**
	 * Reverse the migrations.
	 *
	 * @return void
	 */
	public function down()
	{
		Schema::drop('matches');
	}

}
